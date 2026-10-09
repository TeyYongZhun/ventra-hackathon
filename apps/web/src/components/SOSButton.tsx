import { Link } from 'react-router-dom';

export function SOSButton() {
  return (
    <Link
      to="/emergency"
      aria-label="Emergency SOS"
      style={{
        height: 64,
        padding: '0 22px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-red)',
        color: 'var(--color-surface)',
        textDecoration: 'none',
        fontSize: 'var(--text-title)',
        fontWeight: 700,
        lineHeight: 'var(--lh-title)',
        minWidth: 64,
        justifyContent: 'center',
      }}
    >
      <svg
        width={26}
        height={26}
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
      <span>SOS</span>
    </Link>
  );
}
