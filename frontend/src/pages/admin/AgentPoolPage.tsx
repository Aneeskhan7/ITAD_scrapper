import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MiniBar } from '@/components/shared/MiniBar';
import type { AgentRegistry } from '@/types';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active:     { bg: '#e4f5ed', text: '#1a9e57' },
  idle:       { bg: 'var(--bg)', text: '#6b7280' },
  draining:   { bg: '#fef3c7', text: '#d97706' },
  terminated: { bg: '#fee2e2', text: '#dc2626' },
};

export function AgentPoolPage() {
  const qc = useQueryClient();
  const { data: agents = [] } = useQuery<AgentRegistry[]>({
    queryKey: ['admin-agents'],
    queryFn: () => api.get('/admin/agents').then(r => r.data),
    refetchInterval: 5000,
  });

  const drain = useMutation({
    mutationFn: (id: string) => api.post(`/admin/agents/${id}/drain`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-agents'] }),
  });
  const terminate = useMutation({
    mutationFn: (id: string) => api.post(`/admin/agents/${id}/terminate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-agents'] }),
  });

  const active = agents.filter(a => a.status === 'active').length;
  const idle = agents.filter(a => a.status === 'idle').length;
  const draining = agents.filter(a => a.status === 'draining').length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>Agent Pool</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Manage scraper agent instances and monitor workloads.</p>
        </div>
        <button style={{ padding: '8px 16px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem' }}>
          + Provision Agents
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 13, marginBottom: 20 }}>
        {[
          { label: 'Total', val: agents.length, color: '#2563eb' },
          { label: 'Active', val: active, color: '#1a9e57' },
          { label: 'Idle', val: idle, color: '#6b7280' },
          { label: 'Draining', val: draining, color: '#d97706' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>All Agents ({agents.length})</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['Agent ID', 'Status', 'User', 'Project', 'Pages Scraped', 'CPU', 'Last Heartbeat', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(a => {
              const sc = STATUS_COLOR[a.status] ?? STATUS_COLOR.idle;
              const cpu = (a as any).cpuPercent ?? 0;
              return (
                <tr key={a.id}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.74rem' }}>{a.agentId ?? a.id.slice(0, 16)}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: sc.bg, color: sc.text, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>{a.status}</span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.73rem', color: 'var(--muted)' }}>
                    {(a as any).userName ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(a as any).projectName ?? '—'}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>
                    {((a as any).pagesScraped ?? a.jobsCompleted ?? 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', minWidth: 110 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <MiniBar pct={cpu} color={cpu > 80 ? '#dc2626' : cpu > 50 ? '#d97706' : '#1a9e57'} />
                      <span style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)', minWidth: 30 }}>{cpu}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.74rem' }}>
                    {a.lastHeartbeat ? new Date(a.lastHeartbeat).toLocaleTimeString() : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {a.status === 'active' && (
                        <button onClick={() => drain.mutate(a.id)} disabled={drain.isPending}
                          style={{ padding: '3px 9px', background: '#fef3c7', border: '1.5px solid #fde047', borderRadius: 5, color: '#d97706', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                          Drain
                        </button>
                      )}
                      {a.status !== 'terminated' && (
                        <button onClick={() => terminate.mutate(a.id)} disabled={terminate.isPending}
                          style={{ padding: '3px 9px', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 5, color: '#dc2626', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                          Kill
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {agents.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>No agents registered.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
