import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import type { Notification } from '@/types';

interface TopBarProps { title?: string; isAdmin?: boolean; queueDepth?: number; }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function TopBar({ title, isAdmin, queueDepth }: TopBarProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const clear = useAuthStore(s => s.clear);
  const accessToken = useAuthStore(s => s.accessToken);
  const user = useAuthStore(s => s.user);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Unread count
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    staleTime: 30_000,
    enabled: !!user && !isAdmin,
  });

  // Last 5 for the dropdown
  const { data: recent = [] } = useQuery<Notification[]>({
    queryKey: ['notifications-recent'],
    queryFn: () => api.get('/notifications?limit=5').then(r => r.data),
    staleTime: 30_000,
    enabled: bellOpen && !isAdmin,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      qc.invalidateQueries({ queryKey: ['notifications-recent'] });
    },
  });

  // SSE: push new notifications live
  useEffect(() => {
    if (!accessToken || isAdmin) return;
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(accessToken)}`);
    es.onmessage = () => {
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-recent'] });
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [accessToken, isAdmin, qc]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => {});
    clear();
    navigate('/login');
  };

  const unread = countData?.count ?? 0;

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

        {/* Bell */}
        {!isAdmin && (
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button onClick={() => setBellOpen(o => !o)}
              style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${bellOpen ? 'var(--green)' : 'var(--border)'}`, background: bellOpen ? 'var(--mint)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: bellOpen ? 'var(--green)' : 'var(--muted)', transition: 'all 0.15s' }}>
              🔔
              {unread > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: '0.6rem', fontWeight: 700, minWidth: 16, textAlign: 'center', lineHeight: '16px' }}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            {bellOpen && (
              <div style={{ position: 'absolute', top: 42, right: 0, width: 340, background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.88rem' }}>Notifications</span>
                  {unread > 0 && (
                    <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: '0.65rem', fontWeight: 700 }}>{unread} new</span>
                  )}
                </div>

                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {recent.length === 0 && (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>No notifications</div>
                  )}
                  {recent.map(n => (
                    <div key={n.id}
                      onClick={() => {
                        if (!n.readAt) markRead.mutate(n.id);
                        setBellOpen(false);
                        if (n.link) navigate(n.link);
                      }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border)', cursor: n.link ? 'pointer' : 'default', background: !n.readAt ? 'var(--mint)' : 'transparent', transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (n.readAt) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = !n.readAt ? 'var(--mint)' : 'transparent'; }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: !n.readAt ? 'var(--green)' : 'transparent', marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: !n.readAt ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{n.body}</div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontFamily: 'DM Mono', flexShrink: 0, marginTop: 2 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '10px 16px', borderTop: '1.5px solid var(--border)' }}>
                  <button onClick={() => { setBellOpen(false); navigate('/app/notifications'); }}
                    style={{ width: '100%', padding: '6px 0', borderRadius: 7, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}>
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={handleLogout}
          style={{ padding: '5px 14px', border: '1.5px solid var(--border)', borderRadius: 7,
            color: 'var(--muted)', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem' }}>
          Logout
        </button>
      </div>
    </div>
  );
}
