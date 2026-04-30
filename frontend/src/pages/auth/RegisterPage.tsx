import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', plan: 'starter' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setAuth(data.user, data.accessToken);
      navigate('/onboarding');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed');
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8,
    padding: '10px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '40px 36px', width: 420, maxWidth: '90vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700, marginBottom: 16 }}>⬡</div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.03em', marginBottom: 6 }}>Create account</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Start discovering bids for free</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: 'var(--red-bg)', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: '0.84rem' }}>{error}</div>}

          {[{ k: 'name', l: 'Full name', t: 'text', p: 'John Doe' }, { k: 'email', l: 'Email', t: 'email', p: 'you@company.com' }, { k: 'password', l: 'Password', t: 'password', p: 'Min 8 characters' }].map(({ k, l, t, p }) => (
            <div key={k}>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>{l}</label>
              <input type={t} value={form[k as keyof typeof form]} onChange={e => update(k, e.target.value)} required
                style={inputStyle} placeholder={p}
                onFocus={e => (e.target.style.borderColor = 'var(--green)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
          ))}

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Plan</label>
            <select value={form.plan} onChange={e => update('plan', e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="starter">Starter — Free</option>
              <option value="pro">Professional — $149/mo</option>
              <option value="enterprise">Enterprise — $499/mo</option>
            </select>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px', background: loading ? '#9ca3af' : 'var(--green)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.95rem', marginTop: 4 }}>
            {loading ? 'Creating account…' : 'Get started free'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.84rem', color: 'var(--muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
