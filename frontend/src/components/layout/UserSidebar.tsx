import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const NAV = [
  { id: '/app', icon: '⬡', label: 'Overview' },
  { id: '/app/projects', icon: '⫸', label: 'Projects' },
  { id: '/app/results', icon: '◦', label: 'Discoveries' },
  { id: '/app/dlq', icon: '⚠', label: 'DLQ', badge: true },
  { id: '/app/keywords', icon: '⬌', label: 'Keywords' },
  { id: '/app/settings', icon: '⚙', label: 'Settings' },
];

export function UserSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore(s => s.user);

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
            {!collapsed && <span style={{ fontSize: '0.84rem', fontWeight: 500, whiteSpace: 'nowrap' }}>{n.label}</span>}
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
