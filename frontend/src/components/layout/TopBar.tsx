import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';

interface TopBarProps { title?: string; isAdmin?: boolean; queueDepth?: number; }

export function TopBar({ title, isAdmin, queueDepth }: TopBarProps) {
  const navigate = useNavigate();
  const clear = useAuthStore(s => s.clear);

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    clear();
    navigate('/login');
  };

  return (
    <div style={{ height: 58, borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, background: 'var(--bg2)' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a9e57', boxShadow: '0 0 0 2px #bbf7d0' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>System operational</span>
            {queueDepth !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 12px',
                background: 'var(--sky)', border: '1.5px solid #bfdbfe', borderRadius: 7, marginLeft: 4 }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Queue:</span>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.74rem', color: '#2563eb', fontWeight: 700 }}>{queueDepth}</span>
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.95rem' }}>{title}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <button onClick={handleLogout}
          style={{ padding: '5px 14px', border: '1.5px solid var(--border)', borderRadius: 7,
            color: 'var(--muted)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem' }}>
          Logout
        </button>
      </div>
    </div>
  );
}
