import React from 'react';

interface IconTileProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  bg?: string;
  onClick?: () => void;
}

export function IconTile({ icon, label, badge, bg = 'var(--color-surface)', onClick }: IconTileProps) {
  const tile = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          position: 'relative',
          width: 100,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-xl)',
          border: '2.5px solid rgba(22,32,30,0.18)',
          boxShadow: 'var(--shadow-card)',
          background: bg,
        }}
      >
        {icon}
        {typeof badge === 'number' && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              minWidth: 34,
              height: 34,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-pill)',
              border: '3px solid var(--color-canvas)',
              background: 'var(--color-red)',
              color: 'var(--color-surface)',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: 20,
          lineHeight: '24px',
          fontWeight: 700,
          color: 'var(--color-ink)',
        }}
      >
        {label}
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {tile}
      </button>
    );
  }

  return tile;
}
