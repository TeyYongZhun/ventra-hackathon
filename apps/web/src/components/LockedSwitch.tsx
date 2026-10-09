
interface LockedSwitchProps {
  label?: string;
}

export function LockedSwitch({ label }: LockedSwitchProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
      }}
      role="img"
      aria-label={label ? `${label}, locked on` : 'Locked on'}
    >
      <span
        style={{
          position: 'relative',
          width: 84,
          height: 50,
          boxSizing: 'border-box',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-blue)',
          border: '3px solid var(--color-ink)',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <span
          style={{
            position: 'absolute',
            top: 4,
            left: 34,
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
      </span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-blue-ink)',
        }}
      >
        ON
      </span>
      {label && (
        <span
          style={{
            fontSize: 'var(--text-caption)',
            color: 'var(--color-ink-muted)',
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
