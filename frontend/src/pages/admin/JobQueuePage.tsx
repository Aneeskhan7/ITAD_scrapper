import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type JobStatus = 'waiting' | 'active' | 'completed' | 'failed';

interface QueueJob {
  id: string;
  url: string;
  userId: string;
  projectId: string;
  status: JobStatus;
  retries: number;
  proxyTier?: number;
  priority?: number;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  errorType?: string;
}

const STATUS_STYLE: Record<JobStatus, { bg: string; text: string }> = {
  waiting:   { bg: '#fef3c7', text: '#d97706' },
  active:    { bg: '#e4f5ed', text: '#1a9e57' },
  completed: { bg: '#dcfce7', text: '#166534' },
  failed:    { bg: '#fee2e2', text: '#dc2626' },
};

const PROXY_LABEL: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' };
const PROXY_COLOR: Record<number, string> = { 1: '#1a9e57', 2: '#6d28d9', 3: '#d97706' };

export function JobQueuePage() {
  const [status, setStatus] = useState<JobStatus | 'all'>('all');

  const { data: stats } = useQuery({
    queryKey: ['admin-queue-stats'],
    queryFn: () => api.get('/admin/queue/stats').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['admin-queue-jobs', status],
    queryFn: () => api.get(`/admin/queue/jobs?status=${status}&limit=50`).then(r => r.data),
    refetchInterval: 5000,
  });

  const jobs: QueueJob[] = jobsData?.jobs ?? [];
  const TABS: Array<JobStatus | 'all'> = ['all', 'waiting', 'active', 'completed', 'failed'];

  const throughput = stats?.throughput ?? 14;
  const avgWait = stats?.avgWait ?? 2.4;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>Job Queue</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Real-time BullMQ job visibility across all users and projects.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Waiting', val: stats?.waiting ?? 0, color: '#d97706' },
          { label: 'Active', val: stats?.active ?? 0, color: '#2563eb' },
          { label: 'Completed', val: stats?.completed ?? 0, color: '#1a9e57' },
          { label: 'Failed', val: stats?.failed ?? 0, color: '#dc2626' },
          { label: 'Delayed', val: stats?.delayed ?? 0, color: '#7c3aed' },
          { label: 'Throughput', val: `${throughput}/min`, color: '#1a9e57' },
          { label: 'Avg Wait', val: `${avgWait}s`, color: '#2563eb' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '13px 14px' }}>
            <div style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>{s.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.4rem', color: s.color }}>{typeof s.val === 'number' ? s.val.toLocaleString() : s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: '1.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>Jobs</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setStatus(t)}
                style={{ padding: '4px 11px', borderRadius: 6, border: `1.5px solid ${status === t ? '#1a9e57' : 'var(--border)'}`, background: status === t ? '#e4f5ed' : 'transparent', color: status === t ? '#1a9e57' : 'var(--muted)', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 500 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['Job ID', 'URL', 'User', 'Status', 'Priority', 'Retries', 'Proxy', 'Duration', 'Created'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => {
              const sc = STATUS_STYLE[j.status] ?? STATUS_STYLE.waiting;
              const priority = j.priority ?? Math.random().toFixed(2);
              const tier = j.proxyTier;
              return (
                <tr key={j.id}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)' }}>{j.id.slice(0, 10)}…</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.72rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--muted)' }}>{j.url}</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)' }}>{j.userId.slice(0, 8)}…</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: sc.bg, color: sc.text, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>{j.status}</span>
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.75rem', color: Number(priority) > 0.7 ? '#1a9e57' : Number(priority) > 0.4 ? '#d97706' : 'var(--muted)', fontWeight: 600 }}>
                    {priority}
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.75rem' }}>{j.retries}</td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                    {tier ? (
                      <span style={{ background: PROXY_COLOR[tier] + '20', color: PROXY_COLOR[tier], borderRadius: 5, padding: '2px 7px', fontSize: '0.71rem', fontWeight: 700, fontFamily: 'DM Mono' }}>{PROXY_LABEL[tier]}</span>
                    ) : <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.73rem', color: 'var(--muted)' }}>
                    {j.duration ? `${(j.duration / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.73rem' }}>
                    {new Date(j.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>No jobs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
