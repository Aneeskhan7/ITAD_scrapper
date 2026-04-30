import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.user, data.accessToken);
      navigate(data.user.role === 'admin' ? '/admin' : '/app');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '40px 36px', width: 400, maxWidth: '90vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700, marginBottom: 16 }}>⬡</div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.03em', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Sign in to ITADIntel</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: 'var(--red-bg)', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: '0.84rem' }}>{error}</div>}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans' }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              placeholder="you@company.com" />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', fontFamily: 'DM Sans' }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px', background: loading ? '#9ca3af' : 'var(--green)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.95rem', marginTop: 6, transition: 'background 0.15s' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.84rem', color: 'var(--muted)' }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
