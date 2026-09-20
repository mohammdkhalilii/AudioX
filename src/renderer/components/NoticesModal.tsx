import React, { useEffect, useState } from 'react';

interface NoticesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NoticesModal: React.FC<NoticesModalProps> = ({ isOpen, onClose }) => {
  const [notices, setNotices] = useState<string>('Loading licenses...');

  useEffect(() => {
    if (isOpen) {
      window.audiox.getThirdPartyNotices().then(setNotices).catch(() => {
        setNotices('Could not load third-party notices.');
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 640,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>About AudioX &amp; Legal Notices</h3>
          <button className="btn-link" onClick={onClose}>
            ✕
          </button>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            padding: 12,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            marginBottom: 16,
            color: 'var(--text-secondary)',
          }}
        >
          This application uses FFmpeg under the GNU LGPL v2.1 or later. Noise suppression is provided by DeepFilterNet, downloaded directly from its official project releases. This project is independent and is not affiliated with or endorsed by FFmpeg or the DeepFilterNet maintainers.
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            padding: 12,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-secondary)',
          }}
        >
          {notices}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
