import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV = [
  { id: '/admin', icon: '⬡', label: 'System Overview' },
  { id: '/admin/agents', icon: '⚡', label: 'Agent Pool' },
  { id: '/admin/queue', icon: '⫸', label: 'Job Queue' },
  { id: '/admin/dlq', icon: '⚠', label: 'DLQ Manager', badge: true },
  { id: '/admin/proxies', icon: '🛡', label: 'Proxy Pool' },
  { id: '/admin/ai', icon: '🤖', label: 'AI Classifier' },
  { id: '/admin/users', icon: '⚙', label: 'Users' },
  { id: '/admin/patterns', icon: '⬌', label: 'Patterns' },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (id: string) => pathname === id || (id !== '/admin' && pathname.startsWith(id));

  return (
    <aside style={{ width: collapsed ? 58 : 228, background: 'var(--bg2)', borderRight: '1.5px solid var(--border)',
      display: 'flex', flexDirection: 'column', transition: 'width 0.25s', flexShrink: 0 }}>
      <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1.5px solid var(--border)', height: 58 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, background: '#111118', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0 }}>⬡</div>
        {!collapsed && <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.88rem' }}>
          ITAD<span style={{ color: 'var(--green)' }}>Intel</span>{' '}
          <span style={{ fontSize: '0.62rem', background: 'var(--mint)', color: 'var(--green)',
            padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>ADMIN</span>
        </span>}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => navigate(n.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', borderRadius: 7,
              border: 'none', background: isActive(n.id) ? 'var(--mint)' : 'transparent',
              color: isActive(n.id) ? 'var(--green)' : 'var(--muted)', cursor: 'pointer',
              textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{n.icon}</span>
            {!collapsed && <span style={{ fontSize: '0.835rem', fontWeight: 500, whiteSpace: 'nowrap' }}>{n.label}</span>}
            {!collapsed && n.badge && (
              <span style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff', borderRadius: 100,
                padding: '1px 6px', fontSize: '0.62rem', fontWeight: 700 }}>!</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#111118', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>A</div>
          {!collapsed && <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Admin</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Super User</div>
          </div>}
        </div>
      </div>
    </aside>
  );
}
