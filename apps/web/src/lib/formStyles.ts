// Shared styles for the sign-up and set-up forms: big targets, big text.
import type { CSSProperties } from 'react';

export const fieldLabel: CSSProperties = {
  fontSize: 20,
  lineHeight: '26px',
  fontWeight: 700,
};

export const field: CSSProperties = {
  width: '100%',
  minHeight: 'var(--touch-min)',
  padding: '0 18px',
  borderRadius: 'var(--radius-md)',
  border: '2.5px solid var(--color-ink)',
  background: 'var(--color-surface)',
  color: 'var(--color-ink)',
  fontFamily: 'inherit',
  fontSize: 'var(--text-body)',
};

export function primaryButton(enabled: boolean): CSSProperties {
  return {
    minHeight: 'var(--touch-button)',
    borderRadius: 'var(--radius-pill)',
    border: 0,
    background: enabled ? 'var(--color-ink)' : 'var(--color-sunken)',
    color: enabled ? 'var(--color-surface)' : 'var(--color-ink-muted)',
    fontFamily: 'inherit',
    fontSize: 'var(--text-title)',
    fontWeight: 700,
    cursor: enabled ? 'pointer' : 'default',
  };
}

export const secondaryButton: CSSProperties = {
  minHeight: 'var(--touch-min)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-pill)',
  border: '2.5px solid var(--color-ink)',
  background: 'var(--color-surface)',
  color: 'var(--color-ink)',
  fontFamily: 'inherit',
  fontSize: 21,
  fontWeight: 700,
};
