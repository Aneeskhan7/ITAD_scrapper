import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MiniBar } from '@/components/shared/MiniBar';

interface QueuePoint { t: number; depth: number; active: number }

const EVENTS = [
  { time: '14:32:01', type: 'scale', msg: 'Auto-scaled: +2 agents (queue depth 48 > threshold 40)' },
  { time: '14:28:44', msg: 'DLQ event: timeout — https://procurement.state.gov/bids', type: 'dlq' },
  { time: '14:25:11', msg: 'Pattern learned: "solicitation-2025" promoted to corpus', type: 'learn' },
  { time: '14:21:03', msg: 'Proxy prx-t1-003 restored from cooldown', type: 'proxy' },
  { time: '14:18:50', msg: 'User john@itadintel.io started crawl on 3 websites', type: 'crawl' },
];

const TYPE_COLOR: Record<string, string> = {
  scale: '#2563eb', dlq: '#dc2626', learn: '#6d28d9', proxy: '#d97706', crawl: '#1a9e57',
};

export function SystemOverviewPage() {
  const [chart, setChart] = useState<QueuePoint[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const { data: queueStats } = useQuery({ queryKey: ['admin-queue-stats'], queryFn: () => api.get('/admin/queue/stats').then(r => r.data), refetchInterval: 5000 });
  const { data: dlqStats } = useQuery({ queryKey: ['admin-dlq-stats'], queryFn: () => api.get('/admin/dlq/stats').then(r => r.data), refetchInterval: 5000 });
  const { data: agents = [] } = useQuery<any[]>({ queryKey: ['admin-agents'], queryFn: () => api.get('/admin/agents').then(r => r.data), refetchInterval: 5000 });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ['admin-users'], queryFn: () => api.get('/admin/users').then(r => r.data), refetchInterval: 30000 });

  useEffect(() => {
    const token = localStorage.getItem('access_token') ?? '';
    const es = new EventSource(`/api/monitor/stream?token=${token}`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'queue_depth') {
          setChart(prev => [...prev.slice(-29), { t: Date.now(), depth: d.depth, active: d.active }]);
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

  const activeAgents = agents.filter((a: any) => a.status === 'active').length;
  const totalAgents = agents.length;
  const waiting = queueStats?.waiting ?? 0;
  const completed = queueStats?.completed ?? 0;
  const failed = queueStats?.failed ?? 0;
  const maxDepth = Math.max(...chart.map(p => p.depth), 1);
  const H = 80;

  const projectQueues = [
    { name: 'Gov Procurement Monitor', jobs: 23, color: '#2563eb' },
    { name: 'ITAD Exchange Scan', jobs: 11, color: '#1a9e57' },
    { name: 'State Portal Sweep', jobs: 8, color: '#d97706' },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 5 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 13, marginBottom: 18 }}>
        {[
          { label: 'Active Agents', val: `${activeAgents}/${totalAgents}`, color: '#1a9e57' },
          { label: 'Queue Depth', val: waiting, color: '#2563eb' },
          { label: 'Completed (all)', val: completed.toLocaleString(), color: '#1a9e57' },
          { label: 'Failed', val: failed, color: '#dc2626' },
          { label: 'DLQ Pending', val: dlqStats?.pending ?? 0, color: '#d97706' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 13, marginBottom: 13 }}>
        {/* Live Chart */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>Queue Depth (Live)</span>
            <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: 'var(--muted)' }}>
              <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#1a9e57', marginRight: 4 }} />Queued</span>
              <span><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#2563eb', marginRight: 4 }} />Active</span>
            </div>
          </div>
          {chart.length === 0 ? (
            <div style={{ height: H + 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>
              Waiting for SSE…
            </div>
          ) : (
            <div style={{ position: 'relative', height: H + 24 }}>
              <svg width="100%" height={H} viewBox={`0 0 ${chart.length * 14} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
                {chart.map((p, i) => {
                  const barH = Math.max(2, (p.depth / maxDepth) * (H - 8));
                  const actH = Math.max(2, (p.active / maxDepth) * (H - 8));
                  return (
                    <g key={i}>
                      <rect x={i * 14} y={H - barH} width={6} height={barH} fill="#1a9e57" rx={2} opacity={0.7} />
                      <rect x={i * 14 + 7} y={H - actH} width={5} height={actH} fill="#2563eb" rx={2} opacity={0.5} />
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: 'var(--muted)', fontFamily: 'DM Mono', marginTop: 4 }}>
                <span>{chart[0] ? new Date(chart[0].t).toLocaleTimeString() : ''}</span>
                <span>now</span>
              </div>
            </div>
          )}
        </div>

        {/* Queue by Project */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem', marginBottom: 16 }}>Queue by Project</div>
          {projectQueues.map(pq => (
            <div key={pq.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{pq.name}</span>
                <span style={{ fontFamily: 'DM Mono', color: pq.color, fontWeight: 600, flexShrink: 0 }}>{pq.jobs}</span>
              </div>
              <MiniBar pct={Math.min((pq.jobs / 30) * 100, 100)} color={pq.color} />
            </div>
          ))}
          <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: '0.77rem', color: 'var(--muted)' }}>
            Total pending: <span style={{ fontFamily: 'DM Mono', color: 'var(--text)', fontWeight: 600 }}>{waiting}</span>
          </div>
        </div>

        {/* Auto-Scaling Thresholds */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem', marginBottom: 16 }}>Auto-Scaling Thresholds</div>
          {[
            { label: 'Scale Up at', val: '40 jobs', desc: 'per idle agent slot' },
            { label: 'Scale Down at', val: '5 jobs', desc: 'idle for 2m' },
            { label: 'Max Agents', val: `${totalAgents}`, desc: 'global ceiling' },
            { label: 'DLQ Trigger', val: '10 events', desc: 'pause crawl' },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 1 }}>{t.label}</div>
                <div style={{ fontSize: '0.71rem', color: 'var(--muted)', opacity: 0.7 }}>{t.desc}</div>
              </div>
              <span style={{ fontFamily: 'DM Mono', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{t.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 13 }}>
        {/* System Events */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1.5px solid var(--border)' }}>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>System Events</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            {EVENTS.map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: TYPE_COLOR[ev.type], marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.msg}</div>
                </div>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.7rem', color: 'var(--muted)', flexShrink: 0 }}>{ev.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User Compute Budgets */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1.5px solid var(--border)' }}>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>User Compute Budgets</span>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.slice(0, 6).map((u: any) => {
              const used = u.activeAgents ?? 0;
              const total = u.computeBudget ?? 5;
              const pct = (used / total) * 100;
              return (
                <div key={u.id} style={{ background: 'var(--bg)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.79rem' }}>
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{u.name}</span>
                    <span style={{ fontFamily: 'DM Mono', color: pct > 80 ? '#dc2626' : '#1a9e57', fontWeight: 600, flexShrink: 0 }}>{used}/{total}</span>
                  </div>
                  <MiniBar pct={pct} color={pct > 80 ? '#dc2626' : '#1a9e57'} />
                </div>
              );
            })}
            {users.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>No users.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
