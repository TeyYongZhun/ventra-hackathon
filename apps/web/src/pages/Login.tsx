import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../lib/api';
import { field, fieldLabel, primaryButton, secondaryButton } from '../lib/formStyles';

// A1 · Welcome + A1a · Log in (design/Welcome.dc.html, Login.dc.html), with phone + 4-digit
// PIN instead of SMS codes (SMS is a clickable mock only in this prototype).
export default function Login() {
  const login = useLogin();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const goHome = { onSuccess: () => navigate('/home') };
  const ready = phone.replace(/\D/g, '').length >= 8 && /^\d{4}$/.test(pin);
  const error = login.error as (Error & { code?: string }) | null;
  const errorText = error?.code === 'TOO_MANY_ATTEMPTS'
    ? 'Too many wrong PINs. Please wait 5 minutes and try again.'
    : error
      ? 'That phone number or PIN is not right. Please try again.'
      : '';

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '40px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--color-canvas)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 52, lineHeight: '56px', fontWeight: 700, letterSpacing: '-0.03em' }}>Ventra</h1>
        <p style={{ margin: 0, fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 700 }}>Your daily heart helper.</p>
        <p style={{ margin: 0, fontSize: 20, lineHeight: '28px', color: 'var(--color-ink-muted)' }}>
          We help with water, weight, meals and medicine — every day.
        </p>
      </div>

      <form
        aria-label="Log in"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) login.mutate({ phone: phone.replace(/\D/g, ''), pin }, goHome);
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}
      >
        <h2 style={{ margin: 0, fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>Welcome back</h2>
        <label htmlFor="login-phone" style={fieldLabel}>Phone number</label>
        <input id="login-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="9123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} style={field} />
        <label htmlFor="login-pin" style={fieldLabel}>4-digit PIN</label>
        <input id="login-pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={field} />
        {errorText && <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>{errorText}</p>}
        <button type="submit" disabled={!ready || login.isPending} style={primaryButton(ready && !login.isPending)}>
          {login.isPending ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <Link to="/signup" style={{ ...secondaryButton, textDecoration: 'none' }}>Create an account</Link>

      <button
        type="button"
        onClick={() => login.mutate({ phone: '81234567', pin: '1234' }, goHome)}
        disabled={login.isPending}
        style={{ ...secondaryButton, background: 'var(--color-blue)', border: 0, cursor: 'pointer' }}
      >
        Log in as demo patient
      </button>
      <p style={{ margin: 0, fontSize: 17, lineHeight: '24px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
        Demo patient: Mdm Tan (81234567, PIN 1234). All data is made up.
      </p>
    </div>
  );
}
