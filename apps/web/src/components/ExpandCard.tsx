import React, { useState } from 'react';

interface ExpandCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ExpandCard({ title, icon, children, defaultOpen = false }: ExpandCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
        border: '2.5px solid var(--color-ink)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          minHeight: 88,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 16px',
          border: 0,
          background: 'transparent',
          color: 'var(--color-ink)',
          textAlign: 'left',
          fontFamily: 'inherit',
          fontSize: 'var(--text-title)',
          lineHeight: 'var(--lh-title)',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {icon && (
          <span
            style={{
              width: 56,
              height: 56,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-zest-soft)',
            }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span style={{ flex: 1 }}>{title}</span>
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0,
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-blue-ink)',
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          aria-hidden="true"
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          {open ? 'Less' : 'More'}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: '0 16px 16px',
            fontSize: 'var(--text-body)',
            lineHeight: 'var(--lh-body)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
