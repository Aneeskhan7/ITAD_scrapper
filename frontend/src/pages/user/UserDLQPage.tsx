import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DlqEvent } from '@/types';

const ERROR_TYPES = ['all', 'timeout', 'blocked', 'parse_error', 'http_error'];

const ERROR_PILL: Record<string, { bg: string; color: string }> = {
  timeout:     { bg: '#fef3c7', color: '#d97706' },
  blocked:     { bg: '#fee2e2', color: '#dc2626' },
  parse_error: { bg: '#ede9fe', color: '#6d28d9' },
  http_error:  { bg: '#dbeafe', color: '#1d4ed8' },
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.7rem', color }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function UserDLQPage() {
  const [filter, setFilter] = useState('all');
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['dlq', filter],
    queryFn: () => api.get(`/dlq${filter !== 'all' ? `?errorType=${filter}` : ''}`).then(r => r.data),
  });
  const { data: stats } = useQuery({
    queryKey: ['dlq-stats'],
    queryFn: () => api.get('/dlq/stats').then(r => r.data),
  });

  const events: DlqEvent[] = data?.events ?? [];
  const pending = stats?.pending ?? 0;
  const total = stats?.total ?? 0;
  const resolved = total - pending;
  const failureRate = total > 0 ? (pending / total) * 100 : 0;

  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/dlq/${id}/retry`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dlq'] }),
  });
  const archive = useMutation({
    mutationFn: (id: string) => api.post(`/dlq/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dlq'] }),
  });
  const retryAll = useMutation({
    mutationFn: () => api.post('/dlq/retry-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dlq'] }),
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>Dead-Letter Queue</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Jobs that exhausted 3 retries. Zero jobs lost.</p>
        </div>
        {pending > 0 && (
          <button onClick={() => retryAll.mutate()} disabled={retryAll.isPending}
            style={{ padding: '8px 18px', background: '#d97706', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem' }}>
            {retryAll.isPending ? 'Retrying…' : `↺ Retry All (${pending})`}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Pending Action" value={pending} color="#d97706" />
        <StatCard label="Total Events" value={total} color="#2563eb" />
        <StatCard label="Resolved" value={resolved} color="#1a9e57" />
        <StatCard label="Failure Rate" value={`${failureRate.toFixed(1)}%`} sub="last 24h" color="#dc2626" />
      </div>

      {pending > 0 && (
        <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 10, padding: '11px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          <span style={{ fontSize: '0.83rem', color: '#92400e', fontWeight: 500 }}>
            {pending} job{pending !== 1 ? 's' : ''} failed after 3 retries and require manual action.
          </span>
        </div>
      )}

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: '1.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>Failed Jobs ({events.length})</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {ERROR_TYPES.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding: '4px 11px', borderRadius: 6, border: `1.5px solid ${filter === t ? '#d97706' : 'var(--border)'}`, background: filter === t ? '#fef3c7' : 'transparent', color: filter === t ? '#d97706' : 'var(--muted)', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 500 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['URL', 'Project', 'Error Type', 'Retries', 'Occurred', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map(e => {
              const ep = ERROR_PILL[e.errorType] ?? { bg: '#fef3c7', color: '#d97706' };
              return (
                <tr key={e.id}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.73rem', color: 'var(--muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.url}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--muted)' }}>{(e as any).projectName ?? '—'}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: ep.bg, color: ep.color, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600, fontFamily: 'DM Mono' }}>{e.errorType}</span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.75rem' }}>
                    {(e.payload as { retries?: number })?.retries ?? 3}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.74rem' }}>
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: e.status === 'pending' ? '#fef3c7' : e.status === 'archived' ? 'var(--bg)' : '#e4f5ed', color: e.status === 'pending' ? '#d97706' : e.status === 'archived' ? 'var(--muted)' : '#1a9e57', borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {e.status === 'pending' && (
                        <button onClick={() => retry.mutate(e.id)} disabled={retry.isPending}
                          style={{ padding: '3px 9px', background: '#e4f5ed', border: '1.5px solid #bbf7d0', borderRadius: 5, color: '#1a9e57', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                          Retry
                        </button>
                      )}
                      <button onClick={() => archive.mutate(e.id)} disabled={archive.isPending}
                        style={{ padding: '3px 9px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 5, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.71rem' }}>
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>✅</div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>Zero jobs lost</div>
                  <div style={{ fontSize: '0.82rem' }}>All crawls are running smoothly.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
