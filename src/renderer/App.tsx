import React, { useState, useEffect } from 'react';
import {
  AudioMetadata,
  ProcessingRequest,
  ProcessingResult,
  AppError,
  OutputFormat,
} from '../common/types';
import { SetupView } from './components/SetupView';
import { EmptyView } from './components/EmptyView';
import { ConfigView } from './components/ConfigView';
import { ProcessView } from './components/ProcessView';
import { CompleteView } from './components/CompleteView';
import { FailedView } from './components/FailedView';
import { NoticesModal } from './components/NoticesModal';

type AppState = 'checking' | 'setup' | 'empty' | 'configured' | 'processing' | 'completed' | 'failed';

function formatErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  let msg = err.message || (typeof err === 'string' ? err : fallback);
  // Strip "Error invoking remote method '...': Error: " prefix
  msg = msg.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '');
  return msg.trim() || fallback;
}

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('checking');
  const [fileToken, setFileToken] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [lastRequest, setLastRequest] = useState<ProcessingRequest | null>(null);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isNoticesOpen, setIsNoticesOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!window.audiox) {
      console.error('AudioX bridge not detected in window');
      setAppState('setup');
      return;
    }
    window.audiox
      .getSetupStatus()
      .then((status) => {
        if (status.status === 'installed') {
          setAppState('empty');
        } else {
          setAppState('setup');
        }
      })
      .catch((err) => {
        console.error('getSetupStatus failed:', err);
        setAppState('setup');
      });
  }, []);

  const handleFileSelected = async (token: string, name: string) => {
    try {
      setFileToken(token);
      setFilename(name);
      const meta = await window.audiox.inspectAudio(token);
      setMetadata(meta);
      setAppState('configured');
    } catch (err: any) {
      setCurrentError({
        code: err.code || 'CORRUPT_INPUT',
        message: formatErrorMessage(err, 'Could not inspect selected file'),
      });
      setAppState('failed');
    }
  };

  const handleStartProcessing = async (request: ProcessingRequest) => {
    setLastRequest(request);
    setAppState('processing');

    try {
      const result = await window.audiox.startProcessing(request);
      setActiveJobId(result.jobId);
      setProcessingResult(result);
      setAppState('completed');
    } catch (err: any) {
      setCurrentError({
        code: err.code || 'PROCESS_FAILED',
        message: formatErrorMessage(err, 'Processing failed'),
        diagnostics: err.diagnostics,
      });
      setAppState('failed');
    }
  };

  const handleCancelProcessing = async () => {
    if (activeJobId) {
      await window.audiox.cancelProcessing(activeJobId);
    }
    setAppState('configured');
  };

  const handleRetry = () => {
    if (lastRequest) {
      handleStartProcessing(lastRequest);
    } else {
      setAppState('empty');
    }
  };

  const handleReset = () => {
    setFileToken(null);
    setFilename('');
    setMetadata(null);
    setLastRequest(null);
    setProcessingResult(null);
    setCurrentError(null);
    setActiveJobId(null);
    setAppState('empty');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M2 10v4M6 6v12M10 3v18M14 8v8M18 5v14M22 10v4" />
          </svg>
          <span>AudioX</span>
          <span className="brand-badge">Voice Cleanup</span>
        </div>

        <button className="btn-link" onClick={() => setIsNoticesOpen(true)}>
          Licenses &amp; About
        </button>
      </header>

      <main className="app-content">
        {appState === 'checking' && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Initializing AudioX...
          </div>
        )}

        {appState === 'setup' && (
          <SetupView onSetupComplete={() => setAppState('empty')} />
        )}

        {appState === 'empty' && (
          <EmptyView
            onFileSelected={handleFileSelected}
            onError={(msg) => {
              setCurrentError({ code: 'SELECT_FAILED', message: msg });
              setAppState('failed');
            }}
          />
        )}

        {appState === 'configured' && metadata && fileToken && (
          <ConfigView
            filename={filename}
            fileToken={fileToken}
            metadata={metadata}
            onStartProcessing={handleStartProcessing}
            onChangeFile={handleReset}
          />
        )}

        {appState === 'processing' && (
          <ProcessView onCancel={handleCancelProcessing} />
        )}

        {appState === 'completed' && processingResult && lastRequest && (
          <CompleteView
            result={processingResult}
            sourceFilename={filename}
            outputFormat={lastRequest.outputFormat}
            onProcessAgain={handleReset}
            onError={(msg) => {
              setCurrentError({ code: 'EXPORT_FAILED', message: msg });
              setAppState('failed');
            }}
          />
        )}

        {appState === 'failed' && currentError && (
          <FailedView
            error={currentError}
            onRetry={handleRetry}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="app-footer">
        <span>Offline-first voice restoration powered by DeepFilterNet &amp; FFmpeg</span>
        <span>v1.0.0</span>
      </footer>

      <NoticesModal isOpen={isNoticesOpen} onClose={() => setIsNoticesOpen(false)} />
    </div>
  );
};
