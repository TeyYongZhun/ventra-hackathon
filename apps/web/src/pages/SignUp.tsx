import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup } from '../lib/api';
import { field, fieldLabel, primaryButton } from '../lib/formStyles';

// A1b · Create your account (design/SignUp.dc.html). Phone + 4-digit PIN; set-up follows.
export default function SignUp() {
  const signup = useSignup();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinAgain, setPinAgain] = useState('');
  const [agree, setAgree] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const pinsMatch = pin === pinAgain;
  const ready = name.trim().length > 0 && digits.length >= 8 && /^\d{4}$/.test(pin) && pinsMatch && agree;
  const error = signup.error?.code === 'CONFLICT'
    ? 'This phone number already has an account. Please log in instead.'
    : signup.error
      ? "We couldn't create your account. Please try again."
      : '';

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '28px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--color-canvas)' }}>
      <span style={{ fontSize: 'var(--text-tag)', fontWeight: 700, color: 'var(--color-ink-muted)' }}>Step 1 of 6</span>
      <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700 }}>Create your account</h1>
      <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>It takes about 2 minutes. A nurse or family member can help you.</p>

      <form
        aria-label="Create your account"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) signup.mutate({ name: name.trim(), phone: digits, pin }, { onSuccess: () => navigate('/setup/1') });
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <label htmlFor="su-name" style={fieldLabel}>Your name</label>
        <input id="su-name" autoComplete="name" placeholder="e.g. Tan Ah Mui" value={name} onChange={(e) => setName(e.target.value)} style={field} />

        <label htmlFor="su-phone" style={fieldLabel}>Phone number</label>
        <input id="su-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="9123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} style={field} />

        <label htmlFor="su-pin" style={fieldLabel}>Choose a 4-digit PIN</label>
        <input id="su-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={field} />

        <label htmlFor="su-pin2" style={fieldLabel}>Type the PIN again</label>
        <input id="su-pin2" type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} value={pinAgain} onChange={(e) => setPinAgain(e.target.value.replace(/\D/g, ''))} style={field} />
        {pinAgain.length === 4 && !pinsMatch && (
          <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>The two PINs are different.</p>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 'var(--touch-min)', fontSize: 20, lineHeight: '28px', fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 32, height: 32, flexShrink: 0 }} />
          I agree to how Ventra keeps my health information safe.
        </label>

        {error && <p role="alert" style={{ margin: 0, fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-red)' }}>{error}</p>}
        <button type="submit" disabled={!ready || signup.isPending} style={primaryButton(ready && !signup.isPending)}>
          {signup.isPending ? 'Creating…' : ready ? 'Create account' : agree ? 'Fill in every box' : 'Tick the box to continue'}
        </button>
      </form>

      <p style={{ margin: 0, fontSize: 20, lineHeight: '28px', textAlign: 'center' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--color-blue-ink)', fontWeight: 700 }}>Log in</Link>
      </p>
    </div>
  );
}
