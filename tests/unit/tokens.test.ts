import { describe, it, expect, beforeEach } from 'vitest';
import { TokenRegistry } from '../../src/main/tokens';

describe('TokenRegistry', () => {
  let registry: TokenRegistry;

  beforeEach(() => {
    registry = new TokenRegistry();
  });

  it('registers and resolves file paths', () => {
    const fakePath = '/path/to/recording.wav';
    const token = registry.register(fakePath);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
    expect(registry.resolve(token)).toBe(fakePath);
  });

  it('returns null for nonexistent token', () => {
    expect(registry.resolve('non-existent-token')).toBeNull();
  });

  it('revokes individual tokens', () => {
    const fakePath = '/path/to/file.mp3';
    const token = registry.register(fakePath);

    expect(registry.resolve(token)).toBe(fakePath);
    registry.revoke(token);
    expect(registry.resolve(token)).toBeNull();
  });

  it('revokes all tokens associated with a job', () => {
    const jobId = 'job-123';
    const token1 = registry.register('/tmp/preview1.m4a', jobId);
    const token2 = registry.register('/tmp/preview2.m4a', jobId);
    const unrelatedToken = registry.register('/tmp/unrelated.m4a', 'other-job');

    expect(registry.resolve(token1)).toBeTruthy();
    expect(registry.resolve(token2)).toBeTruthy();
    expect(registry.resolve(unrelatedToken)).toBeTruthy();

    registry.revokeJobTokens(jobId);

    expect(registry.resolve(token1)).toBeNull();
    expect(registry.resolve(token2)).toBeNull();
    expect(registry.resolve(unrelatedToken)).toBeTruthy();
  });
});
