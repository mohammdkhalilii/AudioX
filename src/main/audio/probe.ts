import path from 'node:path';
import { runProcess } from './runner.js';
import type { AudioMetadata } from '../../common/types.js';
import { ErrorCodes } from '../../common/errors.js';

export async function probeAudioFile(
  probeOrFfmpegPath: string,
  filePath: string
): Promise<AudioMetadata> {
  const isFfmpeg = path.basename(probeOrFfmpegPath).toLowerCase().startsWith('ffmpeg');

  if (isFfmpeg) {
    return probeWithFfmpeg(probeOrFfmpegPath, filePath);
  }

  // Otherwise, try ffprobe first, with ffmpeg fallback
  try {
    return await probeWithFfprobe(probeOrFfmpegPath, filePath);
  } catch (err: any) {
    // If ffprobe binary not found, fallback to ffmpeg if possible
    if (err.name === ErrorCodes.INVALID_AUDIO_STREAM) {
      throw err;
    }
    // Attempt with ffmpeg if available in same directory or system
    const ffmpegCandidate = probeOrFfmpegPath.replace(/ffprobe(\.exe)?$/i, 'ffmpeg$1');
    if (ffmpegCandidate !== probeOrFfmpegPath) {
      try {
        return await probeWithFfmpeg(ffmpegCandidate, filePath);
      } catch {
        // Fall back to original error
      }
    }
    throw err;
  }
}

async function probeWithFfprobe(
  ffprobePath: string,
  filePath: string
): Promise<AudioMetadata> {
  const args = [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ];

  let stdout = '';
  try {
    const res = await runProcess({
      executable: ffprobePath,
      args,
    });
    stdout = res.stdout;
  } catch (err: any) {
    const error = new Error(`Cannot probe file with ffprobe: ${err.message}`);
    error.name = ErrorCodes.CORRUPT_INPUT;
    throw error;
  }

  let data: any;
  try {
    data = JSON.parse(stdout);
  } catch {
    const error = new Error('Failed to parse audio probe data');
    error.name = ErrorCodes.CORRUPT_INPUT;
    throw error;
  }

  const streams = data.streams || [];
  const videoStream = streams.find(
    (s: any) =>
      s.codec_type === 'video' &&
      s.codec_name !== 'png' &&
      s.codec_name !== 'jpeg' &&
      s.codec_name !== 'mjpeg'
  );

  if (videoStream) {
    const error = new Error('Video files are not supported. Only audio files are accepted.');
    error.name = ErrorCodes.INVALID_AUDIO_STREAM;
    throw error;
  }

  const audioStream = streams.find((s: any) => s.codec_type === 'audio');
  if (!audioStream) {
    const error = new Error('No audio stream found in the file.');
    error.name = ErrorCodes.INVALID_AUDIO_STREAM;
    throw error;
  }

  const durationStr = audioStream.duration || data.format?.duration;
  const durationSeconds = parseFloat(durationStr);

  if (isNaN(durationSeconds) || durationSeconds <= 0) {
    const error = new Error('Audio file has invalid or zero duration.');
    error.name = ErrorCodes.CORRUPT_INPUT;
    throw error;
  }

  const sampleRate = parseInt(audioStream.sample_rate || '0', 10);
  const channels = parseInt(audioStream.channels || '1', 10);
  const codec = audioStream.codec_name || 'unknown';
  const bitrate = parseInt(audioStream.bit_rate || data.format?.bit_rate || '0', 10) || undefined;
  const format = data.format?.format_name || path.extname(filePath).replace('.', '');

  return {
    format,
    durationSeconds,
    sampleRate,
    channels,
    codec,
    bitrate,
  };
}

async function probeWithFfmpeg(
  ffmpegPath: string,
  filePath: string
): Promise<AudioMetadata> {
  let output = '';
  try {
    const res = await runProcess({
      executable: ffmpegPath,
      args: ['-i', filePath],
    });
    output = res.stderr || res.stdout;
  } catch (err: any) {
    output = err.stderr || err.stdout || err.message || '';
  }

  // Parse duration: Duration: 00:01:23.45
  const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i.exec(output);
  if (!durationMatch) {
    const error = new Error('Could not read audio duration or format from file.');
    error.name = ErrorCodes.CORRUPT_INPUT;
    throw error;
  }

  const hours = parseFloat(durationMatch[1]);
  const mins = parseFloat(durationMatch[2]);
  const secs = parseFloat(durationMatch[3]);
  const durationSeconds = hours * 3600 + mins * 60 + secs;

  // Video check (allow embedded cover art)
  if (/Stream #\d+:\d+.*: Video:/i.test(output)) {
    if (
      !/Video:\s*(?:mjpeg|png|bmp).*\(attached pic\)/i.test(output) &&
      !/Video:\s*(?:mjpeg|png)\s*,\s*rgba/i.test(output)
    ) {
      const error = new Error('Video files are not supported. Only audio files are accepted.');
      error.name = ErrorCodes.INVALID_AUDIO_STREAM;
      throw error;
    }
  }

  // Audio stream check: Stream #0:0: Audio: aac (LC), 48000 Hz, stereo, fltp, 192 kb/s
  const audioMatch = /Stream #\d+:\d+.*: Audio:\s*([a-zA-Z0-9_-]+)[^,]*,\s*(\d+)\s*Hz,\s*([^,]+)/i.exec(output);
  if (!audioMatch) {
    const error = new Error('No audio stream found in the file.');
    error.name = ErrorCodes.INVALID_AUDIO_STREAM;
    throw error;
  }

  const codec = audioMatch[1].toLowerCase();
  const sampleRate = parseInt(audioMatch[2], 10) || 48000;
  const channelStr = audioMatch[3].toLowerCase();
  const channels = channelStr.includes('stereo') ? 2 : channelStr.includes('mono') ? 1 : 2;

  const bitrateMatch = /bitrate:\s*(\d+)\s*kb\/s/i.exec(output);
  const bitrate = bitrateMatch ? parseInt(bitrateMatch[1], 10) * 1000 : undefined;
  const format = path.extname(filePath).replace('.', '') || 'audio';

  return {
    format,
    durationSeconds,
    sampleRate,
    channels,
    codec,
    bitrate,
  };
}
