// Loading and error views for screens that wait on the API.
export function Loading({ what = 'your day' }: { what?: string }) {
  return (
    <p role="status" style={{ margin: 0, padding: 'var(--space-6) 0', fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
      Loading {what}…
    </p>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
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
  );
}
