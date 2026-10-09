
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
          // Locked look from design/Family.dc.html: pale blue track, grey thumb with a padlock.
          background: '#B9DDF8',
          border: '3px solid var(--color-ink-muted)',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <span
          style={{
            position: 'absolute',
            top: 4,
            left: 38,
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-ink-muted)',
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
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={5} y={11} width={14} height={10} rx={2} />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
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
