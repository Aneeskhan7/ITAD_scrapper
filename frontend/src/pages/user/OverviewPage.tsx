import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { MiniBar } from '@/components/shared/MiniBar';
import { TypePill } from '@/components/shared/StatusPill';
import type { Project, Result } from '@/types';

function StatCard({ label, value, sub, color, pct }: { label: string; value: string | number; sub?: string; color: string; pct?: number }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.7rem', color, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>{sub}</div>}
      {pct !== undefined && (
        <div style={{ marginTop: 10 }}>
          <MiniBar pct={pct} color={color} />
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:   { bg: '#e4f5ed', color: '#1a9e57' },
  idle:     { bg: 'var(--bg)', color: 'var(--muted)' },
  crawling: { bg: '#dbeafe', color: '#2563eb' },
  error:    { bg: '#fee2e2', color: '#dc2626' },
};

export function OverviewPage() {
  const navigate = useNavigate();
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });
  const { data: resultsData } = useQuery<{ results: Result[] }>({
    queryKey: ['results', 'recent'],
    queryFn: () => api.get('/results?limit=5').then(r => r.data),
  });
  const { data: dlqStats } = useQuery({
    queryKey: ['dlq-stats'],
    queryFn: () => api.get('/dlq/stats').then(r => r.data),
  });

  const totalJobs = projects.reduce((s, p) => s + (p.jobCount ?? 0), 0);
  const activeAgents = projects.reduce((s, p) => s + (p.activeAgents ?? 0), 0);
  const results = resultsData?.results ?? [];

  return (
    <div style={{ padding: 24 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total Jobs Done" value={totalJobs.toLocaleString()} sub="+12 this hour" color="#1a9e57" pct={72} />
        <StatCard label="Active Agents" value={`${activeAgents} / 20`} sub="of compute budget" color="#2563eb" pct={(activeAgents / 20) * 100} />
        <StatCard label="DLQ Events" value={dlqStats?.total ?? 0} sub={`${dlqStats?.pending ?? 0} pending action`} color="#d97706" pct={Math.min((dlqStats?.pending ?? 0) * 10, 100)} />
        <StatCard label="Avg Yield Rate" value="73%" sub="pages with data" color="#1a9e57" pct={73} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Projects table */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1.5px solid var(--border)' }}>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem' }}>Your Projects</span>
            <button onClick={() => navigate('/app/projects')} style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>View all →</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                {['Project', 'Websites', 'Jobs', 'Status', 'Last Active'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const sc = STATUS_STYLE[p.status] ?? STATUS_STYLE.idle;
                return (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/app/projects/${p.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>{p.websiteCount ?? 0}</td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>{(p.jobCount ?? 0).toLocaleString()}</td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {p.lastActive ? new Date(p.lastActive).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.84rem' }}>
                    No projects yet.{' '}
                    <button onClick={() => navigate('/app/projects')} style={{ color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Create one →</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Queue Health */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 18 }}>Queue Health</div>
          {[
            { label: 'Pending', val: 23, color: '#d97706', pct: 46 },
            { label: 'Processing', val: activeAgents, color: '#2563eb', pct: (activeAgents / 20) * 100 },
            { label: 'Completed (24h)', val: 841, color: '#1a9e57', pct: 100 },
            { label: 'DLQ', val: dlqStats?.pending ?? 0, color: '#dc2626', pct: Math.min((dlqStats?.pending ?? 0) * 10, 100) },
          ].map(i => (
            <div key={i.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{i.label}</span>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: i.color, fontWeight: 600 }}>{i.val.toLocaleString()}</span>
              </div>
              <MiniBar pct={i.pct} color={i.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Discoveries */}
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem' }}>Recent Discoveries</span>
          <button onClick={() => navigate('/app/results')} style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500 }}>View all →</button>
        </div>
        <div style={{ padding: '0 4px' }}>
          {results.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: r.classification === 'bidding' ? '#e4f5ed' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                {r.classification === 'bidding' ? '📋' : '💰'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title ?? r.url}</div>
                <div style={{ fontFamily: 'DM Mono', fontSize: '0.73rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <TypePill type={r.classification} />
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: '#1a9e57', fontWeight: 600 }}>{r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : ''}</span>
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.84rem' }}>
              No discoveries yet. Start a crawl to find bid pages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
