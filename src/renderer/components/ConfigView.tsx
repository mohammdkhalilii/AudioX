import React, { useState } from 'react';
import {
  NoisePreset,
  LoudnessConfig,
  OutputFormat,
  AudioMetadata,
  ProcessingRequest,
} from '../../common/types';
import {
  PRESET_DESCRIPTIONS,
  OUTPUT_FORMAT_CONFIG,
  AUDIO_CONSTRAINTS,
} from '../../common/constants';

interface ConfigViewProps {
  filename: string;
  fileToken: string;
  metadata: AudioMetadata;
  onStartProcessing: (request: ProcessingRequest) => void;
  onChangeFile: () => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  filename,
  fileToken,
  metadata,
  onStartProcessing,
  onChangeFile,
}) => {
  const [preset, setPreset] = useState<NoisePreset>('balanced');
  const [loudnessMode, setLoudnessMode] = useState<'natural' | 'loud' | 'custom'>('natural');
  const [customLufs, setCustomLufs] = useState<number>(-18);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('m4a');

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    const loudness: LoudnessConfig = {
      mode: loudnessMode,
      customLufs: loudnessMode === 'custom' ? customLufs : undefined,
    };
    onStartProcessing({
      inputFileToken: fileToken,
      preset,
      loudness,
      outputFormat,
    });
  };

  return (
    <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* File summary bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 24,
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <div
            style={{
              padding: 8,
              borderRadius: 6,
              background: 'var(--accent-color)',
              color: '#fff',
              display: 'flex',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: '0.95rem',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
              title={filename}
            >
              {filename}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {formatDuration(metadata.durationSeconds)} • {metadata.codec.toUpperCase()} • {metadata.sampleRate} Hz ({metadata.channels === 1 ? 'Mono' : 'Stereo'})
            </div>
          </div>
        </div>
        <button className="btn-secondary" onClick={onChangeFile} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
          Change
        </button>
      </div>

      {/* 1. Noise Preset */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', marginBottom: 8 }}>
          Noise Removal Strength
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {(['light', 'balanced', 'strong'] as NoisePreset[]).map((p) => {
            const isSelected = preset === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                  borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                  boxShadow: isSelected ? '0 0 0 1px var(--accent-color)' : 'none',
                }}
              >
                <div style={{ fontWeight: 600, color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                  {PRESET_DESCRIPTIONS[p].name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {p === 'light' ? '70% cleaned + 30% ambient' : p === 'balanced' ? 'Standard 100% clean' : 'Aggressive post-filtering'}
                </div>
              </button>
            );
          })}
        </div>
        {PRESET_DESCRIPTIONS[preset].warning && (
          <div
            style={{
              marginTop: 8,
              fontSize: '0.8rem',
              color: 'var(--warning-color)',
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning-border)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <strong>Note:</strong> {PRESET_DESCRIPTIONS[preset].warning}
          </div>
        )}
      </div>

      {/* 2. Voice Loudness */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', marginBottom: 8 }}>
          Voice Loudness
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { id: 'natural', label: 'Natural (-18 LUFS)', desc: 'Podcasts & audiobooks' },
            { id: 'loud', label: 'Loud (-16 LUFS)', desc: 'Online video & social' },
            { id: 'custom', label: 'Custom Target', desc: `${customLufs} LUFS` },
          ].map((item) => {
            const isSelected = loudnessMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLoudnessMode(item.id as any)}
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                  borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                  boxShadow: isSelected ? '0 0 0 1px var(--accent-color)' : 'none',
                }}
              >
                <div style={{ fontWeight: 600, color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>

        {loudnessMode === 'custom' && (
          <div
            style={{
              marginTop: 12,
              background: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
              <span>Integrated Loudness Target:</span>
              <strong>{customLufs} LUFS</strong>
            </div>
            <input
              type="range"
              min={AUDIO_CONSTRAINTS.LUFS_CUSTOM_MIN}
              max={AUDIO_CONSTRAINTS.LUFS_CUSTOM_MAX}
              value={customLufs}
              onChange={(e) => setCustomLufs(parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>-24 LUFS (Quieter)</span>
              <span>-12 LUFS (Louder)</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Output Format */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem', marginBottom: 8 }}>
          Output Format
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {(['m4a', 'wav', 'mp3', 'flac'] as OutputFormat[]).map((fmt) => {
            const isSelected = outputFormat === fmt;
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => setOutputFormat(fmt)}
                style={{
                  padding: '8px 12px',
                  background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                  borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                  color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: 600,
                }}
              >
                {fmt.toUpperCase()}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6 }}>
          {OUTPUT_FORMAT_CONFIG[outputFormat].description}
        </div>
      </div>

      {/* Disclose Mono 48kHz */}
      <div
        style={{
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          marginBottom: 20,
          lineHeight: 1.4,
        }}
      >
        Notice: AudioX standardizes output to 48 kHz mono with a true-peak ceiling of -1.5 dBTP.
      </div>

      {/* Action button */}
      <button
        className="btn-primary"
        onClick={handleStart}
        style={{ width: '100%', padding: '12px 24px', fontSize: '1.05rem', fontWeight: 600 }}
      >
        Clean Audio
      </button>
    </div>
  );
};
