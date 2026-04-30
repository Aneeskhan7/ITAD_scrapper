import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MiniBar } from '@/components/shared/MiniBar';
import type { ProxyHealth } from '@/types';

const TIER_CONFIG: Record<number, { label: string; type: string; bg: string; color: string }> = {
  1: { label: 'Tier 1', type: 'Residential', bg: '#e4f5ed', color: '#1a9e57' },
  2: { label: 'Tier 2', type: 'Datacenter', bg: '#ede9fe', color: '#6d28d9' },
  3: { label: 'Tier 3', type: 'Rotating', bg: '#fef3c7', color: '#d97706' },
};

function proxyId(url: string, type: string, idx: number): string {
  const prefix = type === 'residential' ? 'prx-r' : type === 'datacenter' ? 'prx-dc' : 'prx-rt';
  return `${prefix}-${String(idx + 1).padStart(3, '0')}`;
}

export function ProxyPoolPage() {
  const qc = useQueryClient();
  const { data: proxies = [] } = useQuery<ProxyHealth[]>({
    queryKey: ['admin-proxies'],
    queryFn: () => api.get('/admin/proxies').then(r => r.data),
    refetchInterval: 10000,
  });

  const quarantine = useMutation({
    mutationFn: (id: string) => api.post(`/admin/proxies/${id}/demote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-proxies'] }),
  });
  const restore = useMutation({
    mutationFn: (id: string) => api.post(`/admin/proxies/${id}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-proxies'] }),
  });

  const tier1 = proxies.filter(p => p.tier === 1);
  const tier2 = proxies.filter(p => p.tier === 2);
  const tier3 = proxies.filter(p => p.tier === 3);
  const quarantined = proxies.filter(p => p.cooldownUntil && new Date(p.cooldownUntil) > new Date());

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>Proxy Pool</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Health status and management of all proxy tiers.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 13, marginBottom: 20 }}>
        {[
          { label: 'Total Proxies', val: proxies.length, color: '#2563eb' },
          { label: 'Tier 1 Residential', val: tier1.length, color: '#1a9e57' },
          { label: 'Tier 2 Datacenter', val: tier2.length, color: '#6d28d9' },
          { label: 'Quarantined', val: quarantined.length, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {[1, 2, 3].map(tier => {
        const tierProxies = proxies.filter(p => p.tier === tier);
        const tc = TIER_CONFIG[tier];
        return (
          <div key={tier} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ background: tc.bg, color: tc.color, borderRadius: 6, padding: '3px 10px', fontSize: '0.73rem', fontWeight: 700 }}>T{tier}</span>
                <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>{tc.label} — {tc.type}</span>
              </div>
              <span style={{ fontSize: '0.77rem', color: 'var(--muted)' }}>{tierProxies.length} proxies</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  {['Proxy ID', 'IP Display', 'Success Rate', 'Status', 'Cooldown', 'Blocked Domains', 'Last Used', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '7px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tierProxies.map((p, idx) => {
                  const inCooldown = !!(p.cooldownUntil && new Date(p.cooldownUntil) > new Date());
                  const rate = p.successRate * 100;
                  const pid = proxyId(p.proxyUrl, (p as any).proxyType ?? 'residential', idx);
                  return (
                    <tr key={p.id}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.75rem', fontWeight: 600 }}>{pid}</td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.73rem', color: 'var(--muted)' }}>
                        {(p as any).ipDisplay ?? '—'}
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', minWidth: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <MiniBar pct={rate} color={rate > 70 ? '#1a9e57' : rate > 40 ? '#d97706' : '#dc2626'} />
                          <span style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)', minWidth: 30 }}>{rate.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ background: inCooldown ? '#fee2e2' : (p as any).status === 'active' ? '#e4f5ed' : 'var(--bg)', color: inCooldown ? '#dc2626' : (p as any).status === 'active' ? '#1a9e57' : '#6b7280', borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>
                          {inCooldown ? 'quarantined' : ((p as any).status ?? 'active')}
                        </span>
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.73rem' }}>
                        {inCooldown ? (
                          <span style={{ color: '#dc2626', fontFamily: 'DM Mono', fontSize: '0.72rem' }}>{new Date(p.cooldownUntil!).toLocaleTimeString()}</span>
                        ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.71rem', color: 'var(--muted)' }}>
                        {p.blockedDomains.length > 0 ? p.blockedDomains.slice(0, 2).join(', ') + (p.blockedDomains.length > 2 ? ` +${p.blockedDomains.length - 2}` : '') : '—'}
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.73rem' }}>
                        {p.lastUsed ? new Date(p.lastUsed).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                        {inCooldown ? (
                          <button onClick={() => restore.mutate(p.id)}
                            style={{ padding: '3px 9px', background: '#e4f5ed', border: '1.5px solid #bbf7d0', borderRadius: 5, color: '#1a9e57', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                            Restore
                          </button>
                        ) : (
                          <button onClick={() => quarantine.mutate(p.id)}
                            style={{ padding: '3px 9px', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 5, color: '#dc2626', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                            Quarantine
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {tierProxies.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>No proxies in this tier.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
