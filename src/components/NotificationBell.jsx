// src/components/NotificationBell.jsx
import { useEffect, useRef, useState } from 'react';
import {
  BellIcon,
  BellAlertIcon,
  CheckIcon,
  TrashIcon,
  XMarkIcon,
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import {
  subscribeUnreadCount,
  subscribeNotifications,
  markNotifRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
} from '../services/notify';
import { auth } from '../services/firebase';

// Robust millisecond extractor
function toMillisSafe(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000 + (v.nanoseconds ? Math.floor(v.nanoseconds / 1e6) : 0);
  return 0;
}

// Format relative time
function getRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Get notification icon
function getNotificationIcon(type, read) {
  if (read) return <CheckIcon className="w-5 h-5 text-emerald-500" />;
  
  switch (type) {
    case 'unlock':
    case 'claim':
      return <SparklesIcon className="w-5 h-5 text-blue-500" />;
    case 'warning':
    case 'alert':
      return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
    case 'approval':
      return <CheckIcon className="w-5 h-5 text-emerald-500" />;
    default:
      return <BellAlertIcon className="w-5 h-5 text-slate-500" />;
  }
}

// Get notification color
function getNotificationColor(type, read) {
  if (read) return 'bg-slate-50 dark:bg-slate-800/30';
  
  switch (type) {
    case 'unlock':
    case 'claim':
      return 'bg-blue-50 dark:bg-blue-900/20';
    case 'warning':
    case 'alert':
      return 'bg-amber-50 dark:bg-amber-900/20';
    case 'approval':
      return 'bg-emerald-50 dark:bg-emerald-900/20';
    default:
      return 'bg-white dark:bg-slate-800';
  }
}

function NotificationItem({ notification, uid, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const created =
    notification.createdAt?.toDate?.() ??
    (typeof notification.createdAt === 'number' ? new Date(notification.createdAt) : null);

  const handleMarkRead = async (e) => {
    e.stopPropagation();
    if (!notification.read) {
      await markNotifRead(uid, notification.id);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(notification.id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setDeleting(false);
    }
  };

  return (
    <div
      className={`p-4 hover:shadow-md transition-all duration-200 border-l-4 ${
        notification.read ? 'border-slate-300 dark:border-slate-700' : 'border-blue-500'
      } ${getNotificationColor(notification.type, notification.read)} ${
        deleting ? 'opacity-50' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 pt-0.5">
          {getNotificationIcon(notification.type, notification.read)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {notification.title || 'Notification'}
            </h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.read && (
                <button
                  onClick={handleMarkRead}
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Mark as read"
                >
                  <CheckIcon className="w-4 h-4 text-slate-500" />
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <TrashIcon className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <ClockIcon className="w-3 h-3" />
              {getRelativeTime(created)}
            </div>
            {notification.link && (
              <a
                href={notification.link}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                View details →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const uid = auth.currentUser?.uid;
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [deleting, setDeleting] = useState(false);
  const btnRef = useRef(null);

  // Live counts + items
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

  // Close on outside click
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

  if (!uid) return null;

  const Icon = unread > 0 ? BellAlertIcon : BellIcon;

  const filteredItems = filter === 'unread' ? items.filter((n) => !n.read) : items;

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteAllNotifications(uid);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      alert('Failed to clear notifications. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = async (id) => {
    await deleteNotification(uid, id);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="bell-btn hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        <Icon className={`h-6 w-6 ${unread > 0 ? 'animate-pulse' : ''}`} />
        {unread > 0 && <span className="bell-badge animate-bounce">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div
          id="notif-panel"
          className="fixed right-4 md:right-6 top-[70px] w-[min(92vw,28rem)] z-50 animate-slideUp"
        >
          <div className="glass-solid rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BellIcon className="w-5 h-5 text-slate-900 dark:text-white" />
                  <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
                  {unread > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                      {unread}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Close"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Filter & Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    All ({items.length})
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === 'unread'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    Unread ({unread})
                  </button>
                </div>
                <div className="flex gap-2">
                  {unread > 0 && (
                    <button
                      onClick={() => markAllRead(uid)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  {items.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      disabled={deleting}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium disabled:opacity-50"
                    >
                      {deleting ? 'Clearing...' : 'Clear all'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List with fixed height and scroll */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <InboxIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-3" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    {filter === 'unread'
                      ? 'You\'re all caught up!'
                      : 'When you receive notifications, they\'ll appear here'}
                  </p>
                </div>
              ) : (
                filteredItems.map((n) => (
                  <NotificationItem key={n.id} notification={n} uid={uid} onDelete={handleDeleteOne} />
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="sticky bottom-0 px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {filteredItems.length} of {items.length} notification{items.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}