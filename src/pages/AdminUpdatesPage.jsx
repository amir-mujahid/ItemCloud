// src/pages/AdminUpdatesPage.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '../services/firebase';
import {
  collection, getDocs, updateDoc, deleteDoc, doc,
  orderBy, query, limit, serverTimestamp, setDoc, onSnapshot
} from 'firebase/firestore';
import { recapture, adminUnlock, updateUser, updateItem } from '../services/admin';
import {
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PhotoIcon,
  LockOpenIcon,
  UserIcon,
  CubeIcon,
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  BellIcon,
  Cog6ToothIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { pushNotif } from '../services/notify';
import { useI18n } from '../i18n';

// ============= UTILITY FUNCTIONS =============

function formatTimestamp(ts) {
  try {
    const d = ts?.toDate?.() ?? (typeof ts === 'number' ? new Date(ts) : ts instanceof Date ? ts : null);
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '—';
  }
}

function getRelativeTime(ts) {
  try {
    const d = ts?.toDate?.() ?? (typeof ts === 'number' ? new Date(ts) : ts instanceof Date ? ts : null);
    if (!d) return null;
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return null;
  } catch {
    return null;
  }
}

// ============= COMPONENTS =============

function Toast({ message, type = 'info', onClose }) {
  const types = {
    success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-300',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300',
    warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-800 dark:text-amber-300',
  };

  const icons = {
    success: <CheckIcon className="w-5 h-5" />,
    error: <XMarkIcon className="w-5 h-5" />,
    info: <SparklesIcon className="w-5 h-5" />,
    warning: <ExclamationTriangleIcon className="w-5 h-5" />,
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slideUp max-w-md px-4 py-3 rounded-xl border-l-4 shadow-2xl ${types[type]}`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color = 'blue', onClick, pulse }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    cyan: 'from-cyan-500 to-cyan-600',
  };

  return (
    <div
      className={`glass-solid rounded-xl p-5 hover:scale-105 hover:shadow-xl transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${pulse ? 'animate-pulse' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        {pulse && value > 0 && (
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ArrowPathIcon className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, badge, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Badge({ children, color = 'slate', pulse }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]} ${pulse ? 'animate-pulse' : ''}`}>
      {children}
    </span>
  );
}

function ActionButton({ icon, label, onClick, variant = 'default', disabled, loading, size = 'sm' }) {
  const variants = {
    default: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {loading ? (
        <ArrowPathIcon className="w-4 h-4 animate-spin" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Cog6ToothIcon className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">Loading Admin Panel...</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please wait</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
      {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm">{subtitle}</p>}
    </div>
  );
}

function ItemCard({ item, onRecapture, onDelete, actionLoading }) {
  return (
    <div className="glass-solid rounded-xl p-4 hover:shadow-xl transition-all duration-300 group">
      <div className="flex gap-4">
        {/* Image */}
        <div className="relative flex-shrink-0">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.itemID || item.id}
              className="w-32 h-32 object-cover rounded-lg group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-lg flex items-center justify-center">
              <PhotoIcon className="w-12 h-12 text-slate-400" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge color={item.status === 'claimed' ? 'green' : item.status === 'lost' ? 'amber' : 'slate'}>
              {item.status || 'lost'}
            </Badge>
          </div>
        </div>

        {/* Info & Actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  {item.itemID || item.id}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CubeIcon className="w-4 h-4" />
                <span>{item.boxId || item.box || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <ClockIcon className="w-3 h-3" />
                <span>{formatTimestamp(item.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={<PhotoIcon className="w-4 h-4" />}
              label="Box 1"
              onClick={() => onRecapture('box1', item.id)}
              variant="default"
              size="xs"
              loading={actionLoading[`recapture-box1-${item.id}`]}
            />
            <ActionButton
              icon={<PhotoIcon className="w-4 h-4" />}
              label="Box 2"
              onClick={() => onRecapture('box2', item.id)}
              variant="default"
              size="xs"
              loading={actionLoading[`recapture-box2-${item.id}`]}
            />
            <ActionButton
              icon={<TrashIcon className="w-4 h-4" />}
              label="Delete"
              onClick={() => onDelete(item.id)}
              variant="danger"
              size="xs"
              loading={actionLoading[`delete-item-${item.id}`]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, onSetRole, onDelete, actionLoading }) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {user.email}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {user.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {user.fullName || user.displayName || '—'}
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge color={user.role === 'admin' ? 'purple' : 'blue'}>
          <ShieldCheckIcon className={`w-3 h-3 inline mr-1 ${user.role === 'admin' ? '' : 'opacity-50'}`} />
          {user.role || 'user'}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-center gap-2 flex-wrap">
          <ActionButton
            icon={<ShieldCheckIcon className="w-4 h-4" />}
            label="Admin"
            onClick={() => onSetRole(user.id, 'admin')}
            variant="primary"
            size="xs"
            disabled={user.role === 'admin'}
            loading={actionLoading[`role-${user.id}`]}
          />
          <ActionButton
            icon={<UserIcon className="w-4 h-4" />}
            label="User"
            onClick={() => onSetRole(user.id, 'user')}
            variant="default"
            size="xs"
            disabled={user.role === 'user' || !user.role}
            loading={actionLoading[`role-${user.id}`]}
          />
          <ActionButton
            icon={<TrashIcon className="w-4 h-4" />}
            label="Delete"
            onClick={() => onDelete(user.id, user.email)}
            variant="danger"
            size="xs"
            loading={actionLoading[`delete-user-${user.id}`]}
          />
        </div>
      </td>
    </tr>
  );
}

function RequestRow({ request, onApprove, onDeny, actionLoading }) {
  const relTime = getRelativeTime(request.createdAt);
  const isPending = !request.status || request.status === 'pending';

  return (
    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isPending ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm animate-pulse">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-mono text-slate-900 dark:text-white">
              {request.uid?.slice(0, 12)}...
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {request.email || '—'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {formatTimestamp(request.createdAt)}
        </div>
        {relTime && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {relTime}
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        <Badge color={request.status === 'approved' ? 'green' : isPending ? 'amber' : 'red'} pulse={isPending}>
          {request.status || 'pending'}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-center gap-2">
          <ActionButton
            icon={<CheckIcon className="w-4 h-4" />}
            label="Approve"
            onClick={() => onApprove(request)}
            variant="success"
            size="sm"
            disabled={request.status === 'approved'}
            loading={actionLoading[`approve-${request.id}`]}
          />
          <ActionButton
            icon={<XMarkIcon className="w-4 h-4" />}
            label="Deny"
            onClick={() => onDeny(request)}
            variant="danger"
            size="sm"
            loading={actionLoading[`deny-${request.id}`]}
          />
        </div>
      </td>
    </tr>
  );
}

// ============= MAIN COMPONENT =============

export default function AdminUpdatesPage() {
  const { t } = useI18n();

  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Show toast
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  // Real-time data loading
  useEffect(() => {
    const unsubscribers = [];

    // Users
    const usersUnsub = onSnapshot(collection(db, 'Users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error('Error loading users:', error);
      showToast('Failed to load users', 'error');
    });
    unsubscribers.push(usersUnsub);

    // Items
    const itemsUnsub = onSnapshot(
      query(collection(db, 'LostItems'), orderBy('createdAt', 'desc'), limit(100)),
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error('Error loading items:', error);
        showToast('Failed to load items', 'error');
      }
    );
    unsubscribers.push(itemsUnsub);

    // Requests
    const requestsUnsub = onSnapshot(
      query(collection(db, 'EditRequests'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Error loading requests:', error);
        showToast('Failed to load requests', 'error');
        setLoading(false);
      }
    );
    unsubscribers.push(requestsUnsub);

    return () => unsubscribers.forEach(unsub => unsub());
  }, [showToast]);

  // Statistics
  const stats = useMemo(() => {
    const pendingRequests = requests.filter(r => !r.status || r.status === 'pending').length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const lostItems = items.filter(i => i.status === 'lost').length;
    const claimedItems = items.filter(i => i.status === 'claimed').length;
    const recentUsers = users.filter(u => {
      const created = u.createdAt?.toDate?.() || (typeof u.createdAt === 'number' ? new Date(u.createdAt) : null);
      if (!created) return false;
      return Date.now() - created.getTime() < 86400000 * 7; // Last 7 days
    }).length;

    return { pendingRequests, adminUsers, lostItems, claimedItems, totalUsers: users.length, recentUsers };
  }, [requests, users, items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let filtered = items;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(i => i.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i =>
        (i.itemID?.toLowerCase() || '').includes(q) ||
        (i.id?.toLowerCase() || '').includes(q) ||
        (i.box?.toLowerCase() || '').includes(q)
      );
    }

    return filtered;
  }, [items, searchQuery, filterStatus]);

  // Action handlers
  const handleRecapture = useCallback(async (box, itemId) => {
    const key = `recapture-${box}-${itemId}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      const url = await recapture(box);
      if (url && itemId) {
        await updateItem(itemId, { imageUrl: url, updatedAt: new Date() });
      }
      showToast(`Photo captured from ${box}`, 'success');
    } catch (e) {
      showToast(e.message || 'Capture failed', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [showToast]);

  const handleUnlock = useCallback(async (box) => {
    const key = `unlock-${box}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await adminUnlock(box, 15);
      showToast(`${box} unlocked for 15 seconds`, 'success');
    } catch (e) {
      showToast(e.message || 'Unlock failed', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [showToast]);

  const setRole = useCallback(async (id, role) => {
    const key = `role-${id}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await updateUser(id, { role });
      showToast(`User role updated to ${role}`, 'success');
    } catch (e) {
      showToast(e.message || 'Failed to update role', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [showToast]);

  const removeUser = useCallback(async (id, email) => {
    if (!confirm(`Delete user profile for ${email}?\n\n⚠️ This will NOT delete the Firebase Auth account.`)) return;
    const key = `delete-user-${id}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await deleteDoc(doc(db, 'Users', id));
      showToast('User profile deleted', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [showToast]);

  const removeItem = useCallback(async (id) => {
    if (!confirm('Delete this item permanently?')) return;
    const key = `delete-item-${id}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await deleteDoc(doc(db, 'LostItems', id));
      showToast('Item deleted', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to delete item', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [showToast]);

  const approveRequest = useCallback(async (r) => {
    const key = `approve-${r.id}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      const allowedUntil = new Date(Date.now() + 60 * 60 * 1000);
      await setDoc(
        doc(db, 'Users', r.uid, 'settings', 'profileEdit'),
        { allowed: true, allowedUntil, approvedBy: 'admin', approvedAt: serverTimestamp() },
        { merge: true }
      );
      await updateDoc(doc(db, 'EditRequests', r.id), {
        status: 'approved',
        resolvedAt: serverTimestamp(),
      });
      await pushNotif(r.uid, {
        type: 'approval',
        title: t('updates.profileEditApproved') || 'Profile Edit Approved',
        message: t('updates.profileEditApprovedMsg') || 'You can now edit your profile for 1 hour',
        link: '/settings',
        meta: { requestId: r.id, until: allowedUntil.toISOString() },
      });
      showToast('Request approved', 'success');
    } catch (e) {
      showToast(e?.message || 'Failed to approve', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [t, showToast]);

  const denyRequest = useCallback(async (r) => {
    const key = `deny-${r.id}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await setDoc(
        doc(db, 'Users', r.uid, 'settings', 'profileEdit'),
        { allowed: false, allowedUntil: null, approvedBy: null },
        { merge: true }
      );
      await pushNotif(r.uid, {
        type: 'approval',
        title: t('updates.profileEditDenied') || 'Profile Edit Denied',
        message: t('updates.profileEditDeniedMsg') || 'Your request was denied',
        link: '/settings',
        meta: { requestId: r.id },
      });
      await deleteDoc(doc(db, 'EditRequests', r.id));
      showToast('Request denied', 'success');
    } catch (e) {
      showToast(e?.message || 'Failed to deny', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [t, showToast]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="glass-gradient rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Cog6ToothIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Admin Control Panel
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                Manage users, items, and system settings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<ExclamationTriangleIcon className="w-6 h-6 text-white" />}
          label="Pending Requests"
          value={stats.pendingRequests}
          color="red"
          pulse={stats.pendingRequests > 0}
          onClick={() => setActiveTab('requests')}
        />
        <StatCard
          icon={<UserGroupIcon className="w-6 h-6 text-white" />}
          label="Total Users"
          value={stats.totalUsers}
          trend={`+${stats.recentUsers} this week`}
          color="blue"
        />
        <StatCard
          icon={<ShieldCheckIcon className="w-6 h-6 text-white" />}
          label="Admins"
          value={stats.adminUsers}
          color="purple"
        />
        <StatCard
          icon={<CubeIcon className="w-6 h-6 text-white" />}
          label="Lost Items"
          value={stats.lostItems}
          color="amber"
        />
        <StatCard
          icon={<CheckIcon className="w-6 h-6 text-white" />}
          label="Claimed"
          value={stats.claimedItems}
          color="green"
        />
        <StatCard
          icon={<ChartBarIcon className="w-6 h-6 text-white" />}
          label="Total Items"
          value={items.length}
          color="cyan"
        />
      </div>

      {/* Tab Navigation */}
      <div className="glass-solid rounded-xl p-2">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: <ChartBarIcon className="w-4 h-4" /> },
            { id: 'requests', label: 'Edit Requests', icon: <ClockIcon className="w-4 h-4" />, badge: stats.pendingRequests },
            { id: 'users', label: 'Users', icon: <UserIcon className="w-4 h-4" /> },
            { id: 'items', label: 'Items', icon: <CubeIcon className="w-4 h-4" /> },
            { id: 'controls', label: 'Box Controls', icon: <LockOpenIcon className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && (
                <Badge color="red" pulse>
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6">
          {/* Quick Actions */}
          <section className="glass-solid rounded-2xl p-6">
            <SectionHeader
              icon={<SparklesIcon className="w-5 h-5" />}
              title="Quick Actions"
              subtitle="Common administrative tasks"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('requests')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all shadow-lg hover:shadow-xl"
              >
                <ClockIcon className="w-8 h-8" />
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.pendingRequests}</div>
                  <div className="text-sm opacity-90">Pending Requests</div>
                </div>
              </button>
              <button
                onClick={() => handleUnlock('box1')}
                disabled={actionLoading['unlock-box1']}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {actionLoading['unlock-box1'] ? (
                  <ArrowPathIcon className="w-8 h-8 animate-spin" />
                ) : (
                  <LockOpenIcon className="w-8 h-8" />
                )}
                <div className="text-center">
                  <div className="text-lg font-semibold">Unlock Box 1</div>
                  <div className="text-xs opacity-90">15 seconds</div>
                </div>
              </button>
              <button
                onClick={() => handleUnlock('box2')}
                disabled={actionLoading['unlock-box2']}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {actionLoading['unlock-box2'] ? (
                  <ArrowPathIcon className="w-8 h-8 animate-spin" />
                ) : (
                  <LockOpenIcon className="w-8 h-8" />
                )}
                <div className="text-center">
                  <div className="text-lg font-semibold">Unlock Box 2</div>
                  <div className="text-xs opacity-90">15 seconds</div>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all shadow-lg hover:shadow-xl"
              >
                <CubeIcon className="w-8 h-8" />
                <div className="text-center">
                  <div className="text-2xl font-bold">{items.length}</div>
                  <div className="text-sm opacity-90">Manage Items</div>
                </div>
              </button>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="glass-solid rounded-2xl p-6">
            <SectionHeader
              icon={<BellIcon className="w-5 h-5" />}
              title="Recent Activity"
              subtitle="Latest system events"
            />
            <div className="space-y-3">
              {items.slice(0, 5).map((item, idx) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <CubeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      New item: {item.itemID || item.id}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTimestamp(item.createdAt)} • {item.box || '—'}
                    </p>
                  </div>
                  <Badge color={item.status === 'claimed' ? 'green' : 'amber'}>
                    {item.status || 'lost'}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'requests' && (
        <section className="glass-solid rounded-2xl p-6">
          <SectionHeader
            icon={<ClockIcon className="w-5 h-5" />}
            title="Profile Edit Requests"
            subtitle="Manage user profile edit permissions"
            badge={
              stats.pendingRequests > 0 && (
                <Badge color="red" pulse>
                  {stats.pendingRequests} pending
                </Badge>
              )
            }
          />

          {requests.length === 0 ? (
            <EmptyState
              icon={<CheckIcon className="w-12 h-12 text-emerald-500" />}
              title="No pending requests"
              subtitle="All profile edit requests have been processed"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Requested</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {requests.map(r => (
                    <RequestRow
                      key={r.id}
                      request={r}
                      onApprove={approveRequest}
                      onDeny={denyRequest}
                      actionLoading={actionLoading}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'users' && (
        <section className="glass-solid rounded-2xl p-6">
          <SectionHeader
            icon={<UserIcon className="w-5 h-5" />}
            title="User Management"
            subtitle={`${users.length} registered users`}
          />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onSetRole={setRole}
                    onDelete={removeUser}
                    actionLoading={actionLoading}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'items' && (
        <section className="glass-solid rounded-2xl p-6">
          <SectionHeader
            icon={<CubeIcon className="w-5 h-5" />}
            title="Items Management"
            subtitle={`${filteredItems.length} items`}
            action={
              <div className="flex gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="lost">Lost</option>
                  <option value="claimed">Claimed</option>
                  <option value="locked">Locked</option>
                </select>
              </div>
            }
          />

          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<CubeIcon className="w-12 h-12 text-slate-400" />}
              title="No items found"
              subtitle={searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters' : 'No items in the system'}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onRecapture={handleRecapture}
                  onDelete={removeItem}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'controls' && (
        <section className="glass-solid rounded-2xl p-6">
          <SectionHeader
            icon={<LockOpenIcon className="w-5 h-5" />}
            title="Emergency Box Controls"
            subtitle="Unlock boxes remotely for maintenance or emergencies"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleUnlock('box1')}
              disabled={actionLoading['unlock-box1']}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading['unlock-box1'] ? (
                <ArrowPathIcon className="w-16 h-16 animate-spin" />
              ) : (
                <LockOpenIcon className="w-16 h-16" />
              )}
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">Unlock Box 1</div>
                <div className="text-sm opacity-90">Will unlock for 15 seconds</div>
              </div>
            </button>
            <button
              onClick={() => handleUnlock('box2')}
              disabled={actionLoading['unlock-box2']}
              className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all shadow-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading['unlock-box2'] ? (
                <ArrowPathIcon className="w-16 h-16 animate-spin" />
              ) : (
                <LockOpenIcon className="w-16 h-16" />
              )}
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">Unlock Box 2</div>
                <div className="text-sm opacity-90">Will unlock for 15 seconds</div>
              </div>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}