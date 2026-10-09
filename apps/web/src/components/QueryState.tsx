import type { ReactNode } from 'react';

// Loading and error views for screens that wait on the API.
// Pages pass their header so SOS stays on screen while they wait.
export function Loading({ what = 'your day', header }: { what?: string; header?: ReactNode }) {
  return (
    <WithHeader header={header}>
    <p role="status" style={{ margin: 0, padding: 'var(--space-6) 0', fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
      Loading {what}…
    </p>
    </WithHeader>
  );
}

export function LoadError({ onRetry, header }: { onRetry: () => void; header?: ReactNode }) {
  return (
    <WithHeader header={header}>
    <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-6) 0' }}>
      <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
        We couldn't load your information. Please check your internet and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          height: 'var(--touch-button)',
          borderRadius: 'var(--radius-pill)',
          border: 0,
          background: 'var(--color-ink)',
          color: 'var(--color-surface)',
          fontSize: 'var(--text-title)',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
    </WithHeader>
  );
}

function WithHeader({ header, children }: { header?: ReactNode; children: ReactNode }) {
  if (!header) return <>{children}</>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {header}
      {children}
    </div>
  );
}
