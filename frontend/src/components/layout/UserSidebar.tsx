import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

const NAV = [
  { id: '/app',           icon: '⬡', label: 'Overview' },
  { id: '/app/projects',  icon: '⫸', label: 'Projects' },
  { id: '/app/results',   icon: '◦', label: 'Discoveries' },
  { id: '/app/hits',      icon: '⊕', label: 'Hits', hitsbadge: true },
  { id: '/app/dlq',       icon: '⚠', label: 'DLQ' },
  { id: '/app/keywords',  icon: '⬌', label: 'Keywords' },
  { id: '/app/settings',  icon: '⚙', label: 'Settings' },
];

export function UserSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore(s => s.user);

  const { data: hitStats } = useQuery({
    queryKey: ['hits-stats'],
    queryFn: () => api.get('/hits/stats').then(r => r.data as { newLast24h: number }),
    staleTime: 60_000,
    enabled: !!user,
  });

  const newHits = hitStats?.newLast24h ?? 0;
  const isActive = (id: string) => pathname === id || (id !== '/app' && pathname.startsWith(id));

  return (
    <aside style={{ width: collapsed ? 58 : 220, background: 'var(--bg2)', borderRight: '1.5px solid var(--border)',
      display: 'flex', flexDirection: 'column', transition: 'width 0.25s', flexShrink: 0 }}>
      <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1.5px solid var(--border)', height: 58 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--green)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700, flexShrink: 0 }}>⬡</div>
        {!collapsed && <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.95rem' }}>
          ITAD<span style={{ color: 'var(--green)' }}>Intel</span>
        </span>}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => navigate(n.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', borderRadius: 8,
              border: 'none', background: isActive(n.id) ? 'var(--mint)' : 'transparent',
              color: isActive(n.id) ? 'var(--green)' : 'var(--muted)', cursor: 'pointer',
              textAlign: 'left', width: '100%', transition: 'all 0.15s', position: 'relative' }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{n.icon}</span>
            {!collapsed && (
              <>
                <span style={{ fontSize: '0.84rem', fontWeight: 500, whiteSpace: 'nowrap', flex: 1 }}>{n.label}</span>
                {n.hitsbadge && newHits > 0 && (
                  <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: '0.65rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                    {newHits}
                  </span>
                )}
              </>
            )}
            {collapsed && n.hitsbadge && newHits > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: '#dc2626', borderRadius: '50%' }} />
            )}
          </button>
        ))}
      </nav>

      <div style={{ padding: '14px 8px', borderTop: '1.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {!collapsed && <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{user?.plan} Plan</div>
          </div>}
        </div>
      </div>
    </aside>
  );
}
