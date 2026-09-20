import { describe, it, expect } from 'vitest';
import { computeTargetLufs } from '../../src/main/audio/pipeline';
import {
  AUDIO_CONSTRAINTS,
  estimateRequiredTempBytes,
} from '../../src/common/constants';

describe('Audio Pipeline Helpers', () => {
  describe('computeTargetLufs', () => {
    it('returns -18 LUFS for Natural mode', () => {
      expect(computeTargetLufs({ mode: 'natural' })).toBe(-18);
    });

    it('returns -16 LUFS for Loud mode', () => {
      expect(computeTargetLufs({ mode: 'loud' })).toBe(-16);
    });

    it('returns exact target for valid custom values', () => {
      expect(computeTargetLufs({ mode: 'custom', customLufs: -20 })).toBe(-20);
      expect(computeTargetLufs({ mode: 'custom', customLufs: -14 })).toBe(-14);
    });

    it('clamps custom values exceeding limits', () => {
      // Below min -24
      expect(computeTargetLufs({ mode: 'custom', customLufs: -30 })).toBe(
        AUDIO_CONSTRAINTS.LUFS_CUSTOM_MIN
      );
      // Above max -12
      expect(computeTargetLufs({ mode: 'custom', customLufs: -6 })).toBe(
        AUDIO_CONSTRAINTS.LUFS_CUSTOM_MAX
      );
    });

    it('falls back to Natural if customLufs is missing', () => {
      expect(computeTargetLufs({ mode: 'custom' })).toBe(
        AUDIO_CONSTRAINTS.LUFS_TARGET_NATURAL
      );
    });
  });

  describe('estimateRequiredTempBytes', () => {
    it('calculates conservative required space accurately', () => {
      const duration = 60; // 60 seconds
      const estimated = estimateRequiredTempBytes(duration);
      // (60 * 48000 * 4 * 4) + 104857600
      const expected = 60 * 48000 * 16 + 100 * 1024 * 1024;
      expect(estimated).toBe(expected);
      expect(estimated).toBeGreaterThan(100 * 1024 * 1024);
    });
  });
});
