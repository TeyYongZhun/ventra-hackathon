import { useNavigate } from 'react-router-dom';
import { useLogin } from '../lib/api';

export default function Login() {
  const login = useLogin();
  const navigate = useNavigate();

  const handleLogin = () => {
    login.mutate(
      { phone: '81234567', pin: '1234' },
      {
        onSuccess: () => navigate('/home'),
      }
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        gap: '1.5rem',
        background: 'var(--color-canvas)',
      }}
    >
      <h1 style={{ fontSize: 'var(--text-h1)', margin: 0 }}>Ventra</h1>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-ink-muted)', margin: 0 }}>
        Heart-failure self-care companion
      </p>
      <button
        onClick={handleLogin}
        disabled={login.isPending}
        style={{
          height: 64,
          padding: '0 2rem',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-blue)',
          color: 'var(--color-ink)',
          border: 'none',
          fontSize: 'var(--text-title)',
          fontWeight: 700,
          cursor: 'pointer',
          minWidth: 280,
        }}
      >
        {login.isPending ? 'Logging in…' : 'Log in as demo patient'}
      </button>
      {login.isError && (
        <p style={{ color: 'var(--color-red)', fontSize: 'var(--text-body)', margin: 0 }}>
          {login.error?.message || 'Login failed'}
        </p>
      )}
    </div>
  );
}
