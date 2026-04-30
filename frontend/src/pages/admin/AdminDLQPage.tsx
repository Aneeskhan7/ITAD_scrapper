import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DlqRow {
  id: string;
  url: string;
  userId: string;
  projectId: string;
  errorType: string;
  status: string;
  retries: number;
  createdAt: string;
}

const ERROR_PILL: Record<string, { bg: string; color: string }> = {
  timeout:     { bg: '#fef3c7', color: '#d97706' },
  blocked:     { bg: '#fee2e2', color: '#dc2626' },
  parse_error: { bg: '#ede9fe', color: '#6d28d9' },
  http_error:  { bg: '#dbeafe', color: '#1d4ed8' },
  dns_error:   { bg: '#fce7f3', color: '#9d174d' },
};

export function AdminDLQPage() {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['admin-dlq', filter],
    queryFn: () => api.get(`/admin/dlq${filter !== 'all' ? `?errorType=${filter}` : ''}`).then(r => r.data),
    refetchInterval: 10000,
  });
  const { data: stats } = useQuery({
    queryKey: ['admin-dlq-stats'],
    queryFn: () => api.get('/admin/dlq/stats').then(r => r.data),
    refetchInterval: 10000,
  });

  const events: DlqRow[] = data?.events ?? [];
  const retry = useMutation({ mutationFn: (id: string) => api.post(`/admin/dlq/${id}/retry`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-dlq'] }) });
  const archive = useMutation({ mutationFn: (id: string) => api.post(`/admin/dlq/${id}/archive`), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-dlq'] }) });
  const retryAll = useMutation({ mutationFn: () => api.post('/admin/dlq/retry-all'), onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-dlq'] }); setSelected(new Set()); } });

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const pending = stats?.pending ?? 0;
  const total = stats?.total ?? 0;
  const failureRate = stats?.failureRate ?? 0;
  const ERROR_TYPES = ['all', 'timeout', 'blocked', 'parse_error', 'http_error', 'dns_error'];

  // Error type breakdown counts
  const breakdown = ERROR_TYPES.slice(1).map(et => ({
    type: et,
    count: events.filter(e => e.errorType === et).length,
    ...ERROR_PILL[et],
  }));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>DLQ Management</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Dead-letter queue across all users and projects.</p>
        </div>
        {pending > 0 && (
          <button onClick={() => retryAll.mutate()} disabled={retryAll.isPending}
            style={{ padding: '8px 18px', background: '#d97706', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem' }}>
            {retryAll.isPending ? 'Retrying…' : `↺ Retry All (${pending})`}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 13, marginBottom: 16 }}>
        {[
          { label: 'Pending', val: pending, color: '#d97706' },
          { label: 'Total Events', val: total, color: '#2563eb' },
          { label: 'Resolved', val: total - pending, color: '#1a9e57' },
          { label: 'Failure Rate', val: `${(failureRate * 100).toFixed(1)}%`, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Error Type Breakdown */}
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 10, fontFamily: 'Space Grotesk' }}>Error Type Breakdown</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {breakdown.map(b => (
            <div key={b.type} style={{ background: b.bg + '80', border: `1px solid ${b.color}33`, borderRadius: 8, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.71rem', fontWeight: 700, color: b.color, fontFamily: 'DM Mono' }}>{b.type}</span>
              <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem', color: b.color }}>{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {pending > 0 && (
        <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span style={{ fontSize: '0.83rem', color: '#92400e', fontWeight: 500 }}>{pending} jobs pending in DLQ across all users.</span>
        </div>
      )}

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: '1.5px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>All Events ({events.length})</span>
            {selected.size > 0 && <span style={{ fontSize: '0.77rem', color: 'var(--muted)' }}>{selected.size} selected</span>}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {ERROR_TYPES.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1.5px solid ${filter === t ? '#d97706' : 'var(--border)'}`, background: filter === t ? '#fef3c7' : 'transparent', color: filter === t ? '#d97706' : 'var(--muted)', cursor: 'pointer', fontSize: '0.73rem', fontWeight: 500 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              <th style={{ width: 32, padding: '8px 14px', borderBottom: '1.5px solid var(--border)', background: 'var(--bg)' }}>
                <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(events.map(ev => ev.id)) : new Set())} checked={selected.size === events.length && events.length > 0} />
              </th>
              {['URL', 'User', 'Project', 'Error Type', 'Retries', 'Status', 'Occurred', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map(e => {
              const ep = ERROR_PILL[e.errorType] ?? { bg: '#fef3c7', color: '#d97706' };
              return (
                <tr key={e.id} style={{ background: selected.has(e.id) ? '#f0fdf4' : 'transparent' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = selected.has(e.id) ? '#f0fdf4' : 'var(--bg)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = selected.has(e.id) ? '#f0fdf4' : 'transparent')}>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} />
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.url}</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)' }}>{e.userId.slice(0, 8)}…</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)' }}>{(e as any).projectName ?? e.projectId.slice(0, 8)}…</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: ep.bg, color: ep.color, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600, fontFamily: 'DM Mono' }}>{e.errorType}</span>
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.75rem' }}>{e.retries}</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: e.status === 'pending' ? '#fef3c7' : e.status === 'archived' ? 'var(--bg)' : '#e4f5ed', color: e.status === 'pending' ? '#d97706' : e.status === 'archived' ? 'var(--muted)' : '#1a9e57', borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>{e.status}</span>
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.73rem' }}>{new Date(e.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {e.status === 'pending' && (
                        <button onClick={() => retry.mutate(e.id)}
                          style={{ padding: '3px 8px', background: '#e4f5ed', border: '1.5px solid #bbf7d0', borderRadius: 5, color: '#1a9e57', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                          Retry
                        </button>
                      )}
                      <button onClick={() => archive.mutate(e.id)}
                        style={{ padding: '3px 8px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 5, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.71rem' }}>
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div>DLQ is empty.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
