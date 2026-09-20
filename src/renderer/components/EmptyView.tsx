import React, { useState } from 'react';

interface EmptyViewProps {
  onFileSelected: (token: string, filename: string) => void;
  onError: (message: string) => void;
}

export const EmptyView: React.FC<EmptyViewProps> = ({ onFileSelected, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChooseFile = async () => {
    try {
      setIsLoading(true);
      const res = await window.audiox.chooseInputFile();
      if (res) {
        onFileSelected(res.token, res.filename);
      }
    } catch (err: any) {
      onError(err.message || 'Could not select audio file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // In sandboxed Electron, native file picker dialog is the trusted entry point.
    // Prompt user to select via dialog:
    handleChooseFile();
  };

  return (
    <div
      className={`dropzone ${isDragging ? 'active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleChooseFile}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleChooseFile();
        }
      }}
    >
      <svg
        className="dropzone-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        <path d="M12 12v6" />
        <path d="m9 15 3-3 3 3" />
      </svg>

      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 6 }}>
        Drop your spoken audio file here
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
        Supports MP3, WAV, M4A, or FLAC recordings
      </p>

      <button
        className="btn-primary"
        disabled={isLoading}
        onClick={(e) => {
          e.stopPropagation();
          handleChooseFile();
        }}
        style={{ padding: '10px 24px', fontSize: '0.95rem' }}
      >
        {isLoading ? 'Loading...' : 'Choose Audio File'}
      </button>

      <div
        style={{
          marginTop: 24,
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          maxWidth: 400,
        }}
      >
        AudioX converts input recordings to speech-optimized 48 kHz mono. Processing stays 100% on your device.
      </div>
    </div>
  );
};
