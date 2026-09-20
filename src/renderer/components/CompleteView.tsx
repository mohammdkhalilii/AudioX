import React, { useState } from 'react';
import { ABPlayer } from './ABPlayer';
import { ProcessingResult, OutputFormat } from '../../common/types';

interface CompleteViewProps {
  result: ProcessingResult;
  sourceFilename: string;
  outputFormat: OutputFormat;
  onProcessAgain: () => void;
  onError: (msg: string) => void;
}

export const CompleteView: React.FC<CompleteViewProps> = ({
  result,
  sourceFilename,
  outputFormat,
  onProcessAgain,
  onError,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setIsExporting(true);
      const suggestedName = `cleaned_${sourceFilename}`;
      const destPath = await window.audiox.chooseOutputPath(suggestedName, outputFormat);

      if (!destPath) {
        setIsExporting(false);
        return;
      }

      const res = await window.audiox.exportProcessed(result.jobId, destPath, outputFormat);
      if (res.ok) {
        setSavedPath(res.destinationPath);
      }
    } catch (err: any) {
      onError(err.message || 'Failed to export audio file');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenFolder = async () => {
    if (savedPath) {
      await window.audiox.openOutputFolder(savedPath);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            display: 'inline-flex',
            padding: 10,
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            color: 'var(--success-color)',
            marginBottom: 8,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>Audio Cleanup Finished</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Compare the cleaned audio against the original below before saving.
        </p>
      </div>

      {/* Synchronized A/B player */}
      <ABPlayer
        originalToken={result.originalAudioToken}
        cleanedToken={result.cleanedAudioToken}
      />

      {/* Export Status & Actions */}
      {savedPath ? (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success-color)' }}>
              Successfully Saved
            </div>
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
              title={savedPath}
            >
              {savedPath}
            </div>
          </div>
          <button className="btn-secondary" onClick={handleOpenFolder} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            Open Folder
          </button>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button className="btn-secondary" onClick={onProcessAgain} style={{ padding: '12px 20px' }}>
          Process Another File
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={isExporting}
          style={{ padding: '12px 20px', fontWeight: 600 }}
        >
          {isExporting ? 'Saving...' : savedPath ? 'Save As...' : 'Save Cleaned Audio'}
        </button>
      </div>
    </div>
  );
};
