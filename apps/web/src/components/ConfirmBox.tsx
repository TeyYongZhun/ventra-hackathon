import React from 'react';

interface ConfirmBoxProps {
  title: string;
  message: string;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryAction: {
    label: string;
    onClick: () => void;
  };
}

export function ConfirmBox({ title, message, primaryAction, secondaryAction }: ConfirmBoxProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 22,
        padding: '48px 20px 32px',
        textAlign: 'center',
        background: 'var(--color-surface)',
        color: 'var(--color-ink)',
      }}
    >
      <svg
        role="img"
        aria-label="Warning"
        width={150}
        height={134}
        viewBox="0 0 24 21.5"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <path d="M10.27 1.5a2 2 0 0 1 3.46 0l9.5 16.5a2 2 0 0 1-1.73 3H2.5a2 2 0 0 1-1.73-3z" fill="var(--color-red)" />
        <path d="M12 6.5v6.5" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" />
        <circle cx={12} cy={17} r={1.6} fill="#FFFFFF" />
      </svg>

      <h1
        style={{
          margin: 0,
          fontSize: 44,
          lineHeight: '50px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: 24,
          lineHeight: '34px',
          maxWidth: 350,
        }}
      >
        {message}
      </p>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={primaryAction.onClick}
        style={{
          width: '100%',
          minHeight: 112,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-red)',
          color: 'var(--color-surface)',
          border: 'none',
          fontFamily: 'inherit',
          fontSize: 32,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <svg
          width={44}
          height={44}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        {primaryAction.label}
      </button>

      <button
        type="button"
        onClick={secondaryAction.onClick}
        style={{
          width: '100%',
          minHeight: 88,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-pill)',
          border: '3px solid var(--color-ink)',
          background: 'var(--color-surface)',
          color: 'var(--color-ink)',
          fontFamily: 'inherit',
          fontSize: 26,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {secondaryAction.label}
      </button>
    </div>
  );
}
