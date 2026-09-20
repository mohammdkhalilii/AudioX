import React, { useState, useEffect } from 'react';
import { EngineSetupState } from '../../common/types';

interface SetupViewProps {
  onSetupComplete: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({ onSetupComplete }) => {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'verifying' | 'error'>('idle');
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = window.audiox.onDownloadProgress((prog) => {
      setDownloadedBytes(prog.bytesDownloaded);
      setTotalBytes(prog.totalBytes);
      if (prog.bytesDownloaded >= prog.totalBytes && prog.totalBytes > 0) {
        setStatus('verifying');
      }
    });
    return () => unsub();
  }, []);

  const handleDownload = async () => {
    setStatus('downloading');
    setErrorMessage(null);
    setDownloadedBytes(0);
    setTotalBytes(0);

    try {
      const state: EngineSetupState = await window.audiox.downloadEngine();
      if (state.status === 'installed') {
        onSetupComplete();
      } else {
        setStatus('error');
        setErrorMessage(state.error || 'Failed to complete setup');
      }
    } catch (err: any) {
      setStatus('error');
      const msg = err?.message
        ? err.message
        : typeof err === 'string'
        ? err
        : typeof err === 'object' && err !== null
        ? JSON.stringify(err)
        : 'Engine download failed';
      setErrorMessage(msg);
    }
  };

  const handleCancel = async () => {
    await window.audiox.cancelEngineDownload();
    setStatus('idle');
  };

  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;

  return (
    <div className="card" style={{ maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'inline-flex',
            padding: 14,
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            marginBottom: 12,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v10m0 0l-4-4m4 4l4-4" />
            <path d="M20 16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: 8 }}>
          Setup Voice Engine
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          AudioX cleans spoken audio completely offline using DeepFilterNet. To get started, download the official
          speech engine once from its upstream GitHub release.
        </p>
      </div>

      {status === 'idle' && (
        <>
          <div
            style={{
              textAlign: 'left',
              background: 'var(--bg-secondary)',
              padding: 16,
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: 24,
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              About this installation:
            </div>
            <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
              <li>Direct download from official GitHub release repository.</li>
              <li>SHA-256 cryptographic verification before execution.</li>
              <li>Stored in your local user profile — no admin privileges required.</li>
              <li>After this one-time step, AudioX works 100% offline.</li>
            </ul>
          </div>

          <button className="btn-primary" onClick={handleDownload} style={{ width: '100%', padding: '12px 20px', fontSize: '1rem' }}>
            Download &amp; Continue
          </button>
        </>
      )}

      {(status === 'downloading' || status === 'verifying') && (
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>{status === 'verifying' ? 'Verifying SHA-256 Checksum...' : 'Downloading speech engine...'}</span>
            <span>
              {totalBytes > 0 ? `${formatMB(downloadedBytes)} / ${formatMB(totalBytes)} MB (${percent}%)` : 'Connecting...'}
            </span>
          </div>

          <div className="progress-bar-container">
            {status === 'verifying' || totalBytes === 0 ? (
              <div className="progress-bar-fill progress-bar-indeterminate" />
            ) : (
              <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
            )}
          </div>

          <button className="btn-secondary" onClick={handleCancel} style={{ marginTop: 12 }}>
            Cancel
          </button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '8px 0' }}>
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-color)',
              padding: 12,
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            <strong>Setup Failed:</strong> {errorMessage}
          </div>
          <button className="btn-primary" onClick={handleDownload} style={{ width: '100%', padding: '10px 16px' }}>
            Retry Download
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Audio processing runs strictly on your machine. Audio recordings never leave your computer.
      </div>
    </div>
  );
};
