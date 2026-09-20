import React, { useState, useRef, useEffect } from 'react';
import { AUDIO_PROTOCOL_SCHEME } from '../../common/constants';

interface ABPlayerProps {
  originalToken: string;
  cleanedToken: string;
}

export const ABPlayer: React.FC<ABPlayerProps> = ({
  originalToken,
  cleanedToken,
}) => {
  const [activeTrack, setActiveTrack] = useState<'cleaned' | 'original'>('cleaned');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const originalUrl = `${AUDIO_PROTOCOL_SCHEME}://${originalToken}`;
  const cleanedUrl = `${AUDIO_PROTOCOL_SCHEME}://${cleanedToken}`;

  const currentUrl = activeTrack === 'cleaned' ? cleanedUrl : originalUrl;

  const toggleTrack = (track: 'cleaned' | 'original') => {
    if (track === activeTrack) return;
    const prevTime = audioRef.current?.currentTime || 0;
    const wasPlaying = isPlaying;

    setActiveTrack(track);

    // Set time and resume playing on next tick once source switches
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = prevTime;
        if (wasPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
    }, 10);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        marginBottom: 24,
      }}
    >
      <audio
        ref={audioRef}
        src={currentUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* A/B Switcher */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: 4,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => toggleTrack('cleaned')}
          style={{
            padding: '8px 12px',
            background: activeTrack === 'cleaned' ? 'var(--accent-color)' : 'transparent',
            color: activeTrack === 'cleaned' ? '#fff' : 'var(--text-primary)',
            fontWeight: 600,
            borderRadius: 4,
          }}
        >
          Cleaned Audio (Denoised)
        </button>
        <button
          type="button"
          onClick={() => toggleTrack('original')}
          style={{
            padding: '8px 12px',
            background: activeTrack === 'original' ? 'var(--accent-color)' : 'transparent',
            color: activeTrack === 'original' ? '#fff' : 'var(--text-primary)',
            fontWeight: 600,
            borderRadius: 4,
          }}
        >
          Original Audio
        </button>
      </div>

      {/* Scrubber */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <button
          className="btn-primary"
          onClick={togglePlay}
          style={{ width: 48, height: 48, borderRadius: '50%', padding: 0 }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
