import { describe, it, expect, vi } from 'vitest';
import { probeAudioFile } from '../../src/main/audio/probe';
import * as runner from '../../src/main/audio/runner';
import { ErrorCodes } from '../../src/common/errors';

describe('Audio Probe & Validation', () => {
  it('parses valid audio streams and metadata', async () => {
    const mockOutput = JSON.stringify({
      format: {
        format_name: 'wav',
        duration: '12.45',
        bit_rate: '1536000',
      },
      streams: [
        {
          codec_type: 'audio',
          codec_name: 'pcm_s16le',
          sample_rate: '44100',
          channels: 2,
          duration: '12.45',
        },
      ],
    });

    vi.spyOn(runner, 'runProcess').mockResolvedValueOnce({
      exitCode: 0,
      stdout: mockOutput,
      stderr: '',
    });

    const meta = await probeAudioFile('/mock/ffprobe', '/mock/speech.wav');
    expect(meta.durationSeconds).toBe(12.45);
    expect(meta.sampleRate).toBe(44100);
    expect(meta.channels).toBe(2);
    expect(meta.codec).toBe('pcm_s16le');
  });

  it('rejects video containers', async () => {
    const mockOutput = JSON.stringify({
      format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2' },
      streams: [
        { codec_type: 'video', codec_name: 'h264' },
        { codec_type: 'audio', codec_name: 'aac' },
      ],
    });

    vi.spyOn(runner, 'runProcess').mockResolvedValueOnce({
      exitCode: 0,
      stdout: mockOutput,
      stderr: '',
    });

    await expect(
      probeAudioFile('/mock/ffprobe', '/mock/video.mp4')
    ).rejects.toThrowError(/Video files are not supported/);
  });

  it('rejects files without audio streams', async () => {
    const mockOutput = JSON.stringify({
      format: { format_name: 'data' },
      streams: [],
    });

    vi.spyOn(runner, 'runProcess').mockResolvedValueOnce({
      exitCode: 0,
      stdout: mockOutput,
      stderr: '',
    });

    await expect(
      probeAudioFile('/mock/ffprobe', '/mock/silent.dat')
    ).rejects.toThrowError(/No audio stream found/);
  });
});
