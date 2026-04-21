import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../lib/api';

const fmtTime = (d) => {
  const diff = Date.now() - new Date(d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(d).toLocaleDateString();
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const [notifs, count] = await Promise.all([api.getNotifications(), api.getUnreadCount()]);
      setNotifications(notifs);
      setUnread(count.count);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open && unread > 0) {
      await api.markAllRead();
      setUnread(0);
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    }
  };

  const handleClick = async (notif) => {
    setOpen(false);
    navigate(`/leads/${notif.lead_id}`);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center',
          color: open ? 'var(--accent2)' : 'var(--text2)',
          transition: 'all 0.15s',
        }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, background: 'var(--red)', color: 'white',
            fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px', minWidth: 16,
            textAlign: 'center', lineHeight: '14px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, width: 340, background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Notifications</span>
            {notifications.length > 0 && (
              <button onClick={async () => { await api.markAllRead(); setUnread(0); setNotifications(n => n.map(x => ({...x, read: true}))); }}
                style={{ fontSize: 11, color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                <Bell size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                No notifications yet
              </div>
            )}
            {notifications.map(n => (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                  background: n.read ? 'transparent' : 'var(--accent-dim)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'var(--accent-dim)'}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{n.message}</div>
                    {(n.property_address || n.owner_first_name) && (
                      <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>
                        {n.property_address || `${n.owner_first_name || ''} ${n.owner_last_name || ''}`.trim()}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{fmtTime(n.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
