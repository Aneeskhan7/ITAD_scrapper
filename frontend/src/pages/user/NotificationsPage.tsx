import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { Notification } from '@/types';

const TYPE_META: Record<string, { icon: string; color: string }> = {
  keyword_hit:          { icon: '⊕', color: '#7c3aed' },
  crawl_complete:       { icon: '✓', color: '#1a9e57' },
  dlq_alert:            { icon: '⚠', color: '#d97706' },
  discovery_complete:   { icon: '◦', color: '#2563eb' },
  billing:              { icon: '⬡', color: '#dc2626' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', filter],
    queryFn: () =>
      api.get(`/notifications?${filter === 'unread' ? 'unread=true&' : ''}limit=50`).then(r => r.data),
    staleTime: 15_000,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const unreadCount = countData?.count ?? 0;

  function handleClick(n: Notification) {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: 10, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700, verticalAlign: 'middle' }}>
                {unreadCount}
              </span>
            )}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 3 }}>Keyword hits and system alerts.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem', opacity: markAllRead.isPending ? 0.6 : 1 }}>
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
        {(['unread', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${filter === f ? 'var(--green)' : 'var(--border)'}`, background: filter === f ? 'var(--mint)' : 'transparent', color: filter === f ? 'var(--green)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '0.84rem' }}>Loading…</div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔔</div>
            <p style={{ fontWeight: 500, marginBottom: 8 }}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p style={{ fontSize: '0.84rem' }}>Keyword matches and crawl events will appear here.</p>
          </div>
        )}

        {!isLoading && notifications.map(n => {
          const meta = TYPE_META[n.type] ?? { icon: '●', color: 'var(--muted)' };
          const isUnread = !n.readAt;

          return (
            <div key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
                background: isUnread ? 'var(--mint)' : 'var(--bg2)',
                border: `1.5px solid ${isUnread ? '#bbf7d0' : 'var(--border)'}`,
                borderRadius: 10, cursor: n.link ? 'pointer' : 'default', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--green)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = isUnread ? '#bbf7d0' : 'var(--border)'; }}>

              {/* Icon */}
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--bg)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: meta.color, flexShrink: 0 }}>
                {meta.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: '0.87rem', fontWeight: isUnread ? 700 : 500, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title}
                  </span>
                  {isUnread && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'DM Mono', flexShrink: 0 }}>
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.body}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); remove.mutate(n.id); }}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px', flexShrink: 0, opacity: 0.5 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
