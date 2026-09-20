import React, { useState } from 'react';
import { AppError } from '../../common/types';
import { formatDiagnosticsReport } from '../../common/errors';

interface FailedViewProps {
  error: AppError;
  onRetry: () => void;
  onReset: () => void;
}

export const FailedView: React.FC<FailedViewProps> = ({
  error,
  onRetry,
  onReset,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyDiagnostics = () => {
    let reportText = `Error: ${error.message}\nCode: ${error.code}\n`;
    if (error.diagnostics) {
      reportText = formatDiagnosticsReport(error.diagnostics);
    }
    if (window.audiox?.copyToClipboard) {
      window.audiox.copyToClipboard(reportText);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(reportText).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="card" style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ padding: '16px 0' }}>
        <div
          style={{
            display: 'inline-flex',
            padding: 12,
            borderRadius: '50%',
            background: 'var(--danger-bg)',
            color: 'var(--danger-color)',
            marginBottom: 16,
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8, color: 'var(--danger-color)' }}>
          Processing Error
        </h3>

        <p style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: 6 }}>
          {error.message}
        </p>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Error code: <code>{error.code}</code>
        </div>

        {error.diagnostics?.sanitizedStderr && (
          <div
            style={{
              textAlign: 'left',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              maxHeight: 120,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginBottom: 20,
            }}
          >
            {error.diagnostics.sanitizedStderr}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={onReset}>
            Start Over
          </button>
          <button className="btn-secondary" onClick={handleCopyDiagnostics}>
            {copied ? 'Copied to Clipboard!' : 'Copy Diagnostics'}
          </button>
          <button className="btn-primary" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};
