import crypto from 'node:crypto';

export interface TokenEntry {
  token: string;
  filePath: string;
  jobId?: string;
  createdAt: number;
}

export class TokenRegistry {
  private tokens: Map<string, TokenEntry> = new Map();

  register(filePath: string, jobId?: string): string {
    const token = crypto.randomUUID();
    this.tokens.set(token, {
      token,
      filePath,
      jobId,
      createdAt: Date.now(),
    });
    return token;
  }

  resolve(token: string): string | null {
    const entry = this.tokens.get(token);
    return entry ? entry.filePath : null;
  }

  revoke(token: string): void {
    this.tokens.delete(token);
  }

  revokeJobTokens(jobId: string): void {
    for (const [token, entry] of this.tokens.entries()) {
      if (entry.jobId === jobId) {
        this.tokens.delete(token);
      }
    }
  }

  clear(): void {
    this.tokens.clear();
  }
}

export const globalTokenRegistry = new TokenRegistry();
