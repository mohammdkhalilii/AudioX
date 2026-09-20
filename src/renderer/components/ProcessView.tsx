import React, { useEffect, useState } from 'react';
import { PipelineStage, ProcessingProgressEvent } from '../../common/types';

interface ProcessViewProps {
  onCancel: () => void;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  preparing: 'Preparing audio...',
  denoising: 'Removing noise with DeepFilterNet...',
  normalizing: 'Adjusting voice level (loudnorm)...',
  previewing: 'Creating audio preview...',
  completed: 'Done!',
};

export const ProcessView: React.FC<ProcessViewProps> = ({ onCancel }) => {
  const [currentStage, setCurrentStage] = useState<PipelineStage>('preparing');
  const [stageProgress, setStageProgress] = useState<number>(-1);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [stageDetail, setStageDetail] = useState<string | undefined>('Initializing...');

  useEffect(() => {
    const unsub = window.audiox.onProcessingProgress((event: ProcessingProgressEvent) => {
      setCurrentStage(event.stage);
      setStageProgress(event.stageProgress);
      setElapsedSeconds(event.elapsedSeconds);
      if (event.detail) {
        setStageDetail(event.detail);
      }
    });

    // Local elapsed ticker in case progress events are spaced out
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isIndeterminate = stageProgress < 0 || stageProgress > 100;

  return (
    <div className="card" style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ padding: '24px 0' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            color: 'var(--accent-color)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8 }}>
          {STAGE_LABELS[currentStage]}
        </h3>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', minHeight: '1.4em' }}>
          {stageDetail}
        </p>

        <div className="progress-bar-container" style={{ margin: '20px 0 12px' }}>
          {isIndeterminate ? (
            <div className="progress-bar-fill progress-bar-indeterminate" />
          ) : (
            <div className="progress-bar-fill" style={{ width: `${stageProgress}%` }} />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>Elapsed: {formatTime(elapsedSeconds)}</span>
          <span>{isIndeterminate ? 'Processing...' : `${Math.round(stageProgress)}%`}</span>
        </div>

        <div style={{ marginTop: 28 }}>
          <button className="btn-secondary" onClick={onCancel}>
            Cancel Processing
          </button>
        </div>
      </div>
    </div>
  );
};
