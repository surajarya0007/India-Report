'use client';

import React from 'react';
import { X } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DisclaimerModal({ isOpen, onClose }: DisclaimerModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="ir-modal-overlay open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="ir-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-primary)',
          borderRadius: 8,
          width: '100%',
          maxWidth: 600,
          padding: 0,
          position: 'relative',
          boxShadow: 'var(--shadow-xl)',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-secondary)',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 16,
            fontWeight: 800,
            color: '#1565c0', // Royal blue as in user screenshot
            letterSpacing: '0.05em',
            margin: 0,
            textTransform: 'uppercase',
          }}>
            Disclaimer
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-faint)',
              padding: 6,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          maxHeight: '60vh',
          overflowY: 'auto',
          fontSize: '13.5px',
          lineHeight: '1.65',
          color: 'var(--color-ink-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <p style={{ margin: 0 }}>
            The content published on this website is generated and/or assisted entirely by artificial intelligence and is provided for informational purposes only. While we make reasonable efforts to ensure the correctness, accuracy, and timeliness of the information presented, we do not guarantee the completeness, reliability, or current validity of any content.
          </p>
          <p style={{ margin: 0 }}>
            The information provided on this website should not be considered professional, legal, financial, or investment advice. Users are strongly encouraged to independently verify information before making any decisions based on the content available here.
          </p>
          <p style={{ margin: 0 }}>
            All images displayed on this website are selected from publicly available sources on the internet. We do not claim ownership or copyright over any third-party images unless explicitly stated. All rights belong to their respective owners. If you believe any image infringes upon your copyright, please contact us for prompt review and appropriate action.
          </p>
          <p style={{ margin: 0 }}>
            All content on this platform is AI-generated and is not intended to harm, defame, misrepresent, or offend any individual, organization, community, or group within society. Any resemblance to real events, persons, or entities is purely coincidental and unintentional.
          </p>
          <p style={{ margin: 0 }}>
            We shall not be held responsible for any losses, damages, or actions taken based on the information provided on this website.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '16px 24px',
          borderTop: '1px solid var(--border-secondary)',
          background: 'var(--bg-secondary)',
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#1565c0', // Blue button as in screenshot
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '10px 24px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'background 0.2s',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#0d47a1'}
            onMouseLeave={e => e.currentTarget.style.background = '#1565c0'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
