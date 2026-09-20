import { describe, it, expect, vi } from 'vitest';
import { exportFinalAudio } from '../../src/main/audio/pipeline';
import * as runner from '../../src/main/audio/runner';

describe('Pipeline Export Operations', () => {
  it('constructs correct arguments for WAV export', async () => {
    const runSpy = vi.spyOn(runner, 'runProcess').mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    await exportFinalAudio(
      '/bin/ffmpeg',
      '/tmp/master.wav',
      '/output/cleaned.wav',
      'wav'
    );

    expect(runSpy).toHaveBeenCalledWith({
      executable: '/bin/ffmpeg',
      args: [
        '-y',
        '-i',
        '/tmp/master.wav',
        '-vn',
        '-ar',
        '48000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s24le',
        '/output/cleaned.wav',
      ],
    });
  });

  it('constructs correct arguments for M4A AAC export', async () => {
    const runSpy = vi.spyOn(runner, 'runProcess').mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    await exportFinalAudio(
      '/bin/ffmpeg',
      '/tmp/master.wav',
      '/output/cleaned.m4a',
      'm4a'
    );

    expect(runSpy).toHaveBeenCalledWith({
      executable: '/bin/ffmpeg',
      args: [
        '-y',
        '-i',
        '/tmp/master.wav',
        '-vn',
        '-ar',
        '48000',
        '-ac',
        '1',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '/output/cleaned.m4a',
      ],
    });
  });

  it('constructs correct arguments for FLAC lossless export', async () => {
    const runSpy = vi.spyOn(runner, 'runProcess').mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    await exportFinalAudio(
      '/bin/ffmpeg',
      '/tmp/master.wav',
      '/output/cleaned.flac',
      'flac'
    );

    expect(runSpy).toHaveBeenCalledWith({
      executable: '/bin/ffmpeg',
      args: [
        '-y',
        '-i',
        '/tmp/master.wav',
        '-vn',
        '-ar',
        '48000',
        '-ac',
        '1',
        '-c:a',
        'flac',
        '-compression_level',
        '8',
        '/output/cleaned.flac',
      ],
    });
  });
});
