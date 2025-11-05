// src/components/NotificationBell.jsx
import { useEffect, useRef, useState } from 'react';
import { BellIcon, BellAlertIcon, CheckIcon } from '@heroicons/react/24/outline';
import {
  subscribeUnreadCount,
  subscribeNotifications,
  markNotifRead,
  markAllRead,
} from '../services/notify';
import { auth } from '../services/firebase';

// robust millisecond extractor for Firestore Timestamp | Date | number | string
function toMillisSafe(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  // Firestore Timestamp object
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000 + (v.nanoseconds ? Math.floor(v.nanoseconds / 1e6) : 0);
  return 0;
}

export default function NotificationBell() {
  const uid = auth.currentUser?.uid;
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  // live counts + items
  useEffect(() => {
    if (!uid) return;
    const off1 = subscribeUnreadCount(uid, setUnread);
    const off2 = subscribeNotifications(uid, (arr = []) => {
      const sorted = [...arr].sort((a, b) => {
        const ta = toMillisSafe(a?.createdAt);
        const tb = toMillisSafe(b?.createdAt);
        return tb - ta;
      });
      setItems(sorted);
    });
    return () => {
      off1?.();
      off2?.();
    };
  }, [uid]);

  // close on outside click (for fixed panel)
  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      const p = document.getElementById('notif-panel');
      if (p && !p.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // scroll to top whenever opened
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = 0;
  }, [open]);

  if (!uid) return null;

  const Icon = unread > 0 ? BellAlertIcon : BellIcon;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="bell-btn hover:bg-slate-200/60 dark:hover:bg-slate-800"
        aria-label="Notifications"
        title="Notifications"
      >
        <Icon className="h-6 w-6" />
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div id="notif-panel" className="fixed right-4 md:right-6 top-[70px] w-[min(92vw,28rem)] z-50">
          <div className="popover-solid notif-panel">
            {/* header */}
            <div className="sticky top-0 z-10 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Notifications</div>
                {unread > 0 && (
                  <button onClick={() => markAllRead(uid)} className="text-xs text-blue-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* list */}
            <ul ref={listRef} className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.length === 0 && <li className="p-4 text-sm text-slate-500">No notifications yet.</li>}

              {items.map(n => {
                const created =
                  n.createdAt?.toDate?.() ??
                  (typeof n.createdAt === 'number' ? new Date(n.createdAt) : null);

                return (
                  <li key={n.id} className="p-3 flex gap-2">
                    <div className="pt-0.5">
                      {!n.read ? <BellAlertIcon className="h-5 w-5" /> : <CheckIcon className="h-5 w-5 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{n.title || 'Update'}</div>
                      <div className="text-xs text-slate-500 break-words">{n.message}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{created ? created.toLocaleString() : '—'}</div>
                      {n.link && (
                        <a href={n.link} className="text-xs text-blue-600 hover:underline">
                          Open
                        </a>
                      )}
                    </div>
                    {!n.read && (
                      <button className="text-xs px-2 py-1 rounded border" onClick={() => markNotifRead(uid, n.id)}>
                        Mark read
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
