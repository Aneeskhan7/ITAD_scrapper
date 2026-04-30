import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

const INPUT = { width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', fontFamily: 'DM Sans', boxSizing: 'border-box' as const };
const LABEL = { fontSize: '0.77rem', color: 'var(--muted)', fontWeight: 500, marginBottom: 6, display: 'block' as const };
const BTN_PRIMARY = { padding: '8px 20px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem' };
const CARD = { background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 22 };

const PLAN_MAP: Record<string, { label: string; color: string; desc: string; renewal: string }> = {
  free:       { label: 'STARTER', color: '#6b7280', desc: '5 agents · 500 pages/mo · 1 project', renewal: '—' },
  pro:        { label: 'PROFESSIONAL', color: '#1d4ed8', desc: '20 agents · 50,000 pages/mo · unlimited projects', renewal: 'May 30, 2025' },
  enterprise: { label: 'ENTERPRISE', color: '#d97706', desc: '100+ agents · unlimited pages · dedicated infra', renewal: 'Dec 31, 2025' },
};

export function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const { data: me } = useQuery<User>({ queryKey: ['me'], queryFn: () => api.get('/auth/me').then(r => r.data) });

  const [name, setName] = useState(me?.name ?? user?.name ?? '');
  const [org, setOrg] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [depth, setDepth] = useState('2');
  const [budget, setBudget] = useState('50');
  const [retryLimit, setRetryLimit] = useState('3');
  const [dlqThreshold, setDlqThreshold] = useState('10');
  const [computeAlert, setComputeAlert] = useState('80');
  const [emailDigest, setEmailDigest] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);

  const planKey = (me as any)?.plan ?? (me as any)?.tier ?? 'free';
  const planInfo = PLAN_MAP[planKey] ?? PLAN_MAP.free;

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/auth/me', { name }),
    onSuccess: () => { setSaved('profile'); setTimeout(() => setSaved(null), 2500); },
  });

  const updatePassword = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: currentPw, newPassword: newPw }),
    onSuccess: () => { setCurrentPw(''); setNewPw(''); setSaved('password'); setTimeout(() => setSaved(null), 2500); },
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>Settings</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Manage your account, plan, and scraping preferences.</p>
      </div>

      {/* 2×2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Account */}
        <div style={CARD}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 18 }}>Account</div>
          <div style={{ marginBottom: 13 }}>
            <label style={LABEL}>Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={INPUT} />
          </div>
          <div style={{ marginBottom: 13 }}>
            <label style={LABEL}>Email</label>
            <input value={me?.email ?? user?.email ?? ''} readOnly style={{ ...INPUT, opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={LABEL}>Organization</label>
            <input value={org} onChange={e => setOrg(e.target.value)} placeholder="Your company name" style={INPUT} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={LABEL}>Change Password</label>
            <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" style={{ ...INPUT, marginBottom: 8 }} />
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 8 chars)" style={INPUT} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} style={BTN_PRIMARY}>
              {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
            </button>
            {currentPw && newPw && (
              <button onClick={() => updatePassword.mutate()} disabled={updatePassword.isPending}
                style={{ ...BTN_PRIMARY, background: '#2563eb' }}>
                {updatePassword.isPending ? 'Updating…' : 'Update Password'}
              </button>
            )}
            {saved && <span style={{ fontSize: '0.79rem', color: 'var(--green)' }}>✓ {saved === 'profile' ? 'Saved' : 'Password updated'}</span>}
          </div>
        </div>

        {/* Plan & Billing */}
        <div style={CARD}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 18 }}>Plan & Billing</div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <span style={{ background: planInfo.color, color: '#fff', borderRadius: 5, padding: '2px 9px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>{planInfo.label}</span>
              </div>
              {planKey !== 'enterprise' && (
                <button style={{ padding: '5px 12px', background: 'var(--green)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem' }}>Upgrade</button>
              )}
            </div>
            <div style={{ fontSize: '0.79rem', color: 'var(--muted)', lineHeight: 1.5 }}>{planInfo.desc}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Renewal Date</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.8rem', fontWeight: 500 }}>{planInfo.renewal}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Compute Budget</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.8rem', fontWeight: 500 }}>{me?.computeBudget ?? 5} agents</div>
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            Need more capacity?{' '}
            <span style={{ color: 'var(--green)', cursor: 'pointer', fontWeight: 500 }}>Contact sales →</span>
          </div>
        </div>

        {/* Scraping Defaults */}
        <div style={CARD}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 18 }}>Scraping Defaults</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={LABEL}>Default Depth</label>
              <select value={depth} onChange={e => setDepth(e.target.value)} style={{ ...INPUT }}>
                {['1', '2', '3', '4', '5'].map(d => <option key={d} value={d}>Depth {d}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Page Budget</label>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} min={10} max={500} style={INPUT} />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={LABEL}>Retry Limit</label>
            <select value={retryLimit} onChange={e => setRetryLimit(e.target.value)} style={{ ...INPUT }}>
              {['1', '2', '3', '4', '5'].map(n => <option key={n} value={n}>{n} retries</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={BTN_PRIMARY}>Save Defaults</button>
            <span style={{ fontSize: '0.77rem', color: 'var(--muted)' }}>Applied to new websites only.</span>
          </div>
        </div>

        {/* Alerts */}
        <div style={CARD}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 18 }}>Alerts</div>
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>DLQ Threshold</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="number" value={dlqThreshold} onChange={e => setDlqThreshold(e.target.value)} min={1} max={100} style={{ ...INPUT, width: 80 }} />
              <span style={{ fontSize: '0.79rem', color: 'var(--muted)' }}>alert when DLQ exceeds this count</span>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Compute Alert (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="number" value={computeAlert} onChange={e => setComputeAlert(e.target.value)} min={10} max={100} style={{ ...INPUT, width: 80 }} />
              <span style={{ fontSize: '0.79rem', color: 'var(--muted)' }}>alert when budget usage exceeds</span>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL}>Email Digest</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setEmailDigest(v => !v)}
                style={{ width: 44, height: 24, borderRadius: 12, background: emailDigest ? '#1a9e57' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: emailDigest ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{emailDigest ? 'Daily digest enabled' : 'Digest disabled'}</span>
            </div>
          </div>
          <button style={BTN_PRIMARY}>Save Alerts</button>
        </div>

      </div>
    </div>
  );
}
