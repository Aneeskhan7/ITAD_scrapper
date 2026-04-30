import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MiniBar } from '@/components/shared/MiniBar';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan?: string;
  tier?: string;
  role?: string;
  computeBudget: number;
  activeAgents?: number;
  projectCount: number;
  jobCount: number;
  status?: string;
  createdAt: string;
}

const PLAN_OPTIONS = ['starter', 'pro', 'enterprise'];

const PLAN_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  starter:    { bg: 'var(--bg)', text: '#6b7280', label: 'STARTER' },
  free:       { bg: 'var(--bg)', text: '#6b7280', label: 'STARTER' },
  pro:        { bg: '#dbeafe', text: '#1d4ed8', label: 'PRO' },
  enterprise: { bg: '#fef3c7', text: '#d97706', label: 'ENTERPRISE' },
};

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState('starter');
  const [editBudget, setEditBudget] = useState(5);
  const qc = useQueryClient();

  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const update = useMutation({
    mutationFn: ({ id, tier, computeBudget }: { id: string; tier: string; computeBudget: number }) =>
      api.patch(`/admin/users/${id}`, { plan: tier, computeBudget }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setEditId(null); },
  });

  const getPlan = (u: AdminUser) => u.plan ?? u.tier ?? 'starter';

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const enterpriseCount = users.filter(u => getPlan(u) === 'enterprise').length;
  const proCount = users.filter(u => getPlan(u) === 'pro').length;
  const starterCount = users.filter(u => getPlan(u) === 'starter' || getPlan(u) === 'free').length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>Users</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Manage accounts, plans, and compute budgets.</p>
      </div>

      {/* Plan distribution stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 13, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Enterprise</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#d97706' }}>{enterpriseCount}</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Pro</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#1d4ed8' }}>{proCount}</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Starter</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#6b7280' }}>{starterCount}</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Total Users</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#2563eb' }}>{users.length}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>All Users ({filtered.length})</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
            style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '6px 11px', color: 'var(--text)', fontSize: '0.8rem', outline: 'none', fontFamily: 'DM Sans', width: 220 }} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['User', 'Plan', 'Compute', 'Agents', 'Projects', 'Jobs', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const plan = getPlan(u);
              const ps = PLAN_STYLE[plan] ?? PLAN_STYLE.starter;
              const isEditing = editId === u.id;
              const usedBudget = u.activeAgents ?? 0;
              const totalBudget = u.computeBudget;
              const budgetPct = totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0;
              return (
                <tr key={u.id}
                  onMouseEnter={e => !isEditing && (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => !isEditing && (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{u.name}</div>
                    <div style={{ fontFamily: 'DM Mono', fontSize: '0.71rem', color: 'var(--muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    {isEditing ? (
                      <select value={editTier} onChange={e => setEditTier(e.target.value)}
                        style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem', color: 'var(--text)' }}>
                        {PLAN_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span style={{ background: ps.bg, color: ps.text, borderRadius: 5, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em' }}>{ps.label}</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', minWidth: 120 }}>
                    {isEditing ? (
                      <input type="number" value={editBudget} onChange={e => setEditBudget(+e.target.value)} min={1} max={100}
                        style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: '0.78rem', color: 'var(--text)', width: 60 }} />
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.72rem' }}>
                          <span style={{ fontFamily: 'DM Mono', color: 'var(--muted)' }}>{usedBudget} / {totalBudget}</span>
                        </div>
                        <MiniBar pct={budgetPct} color={budgetPct > 80 ? '#dc2626' : '#1a9e57'} />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>{usedBudget}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>{u.projectCount}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>{(u.jobCount ?? 0).toLocaleString()}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: u.status === 'suspended' ? '#fee2e2' : '#e4f5ed', color: u.status === 'suspended' ? '#dc2626' : '#1a9e57', borderRadius: 5, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}>
                      {u.status ?? 'active'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.73rem' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => update.mutate({ id: u.id, tier: editTier, computeBudget: editBudget })} disabled={update.isPending}
                          style={{ padding: '3px 9px', background: '#1a9e57', border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                          Save
                        </button>
                        <button onClick={() => setEditId(null)}
                          style={{ padding: '3px 7px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 5, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.71rem' }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditId(u.id); setEditTier(plan); setEditBudget(u.computeBudget); }}
                        style={{ padding: '3px 9px', background: '#e4f5ed', border: '1.5px solid #bbf7d0', borderRadius: 5, color: '#1a9e57', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
