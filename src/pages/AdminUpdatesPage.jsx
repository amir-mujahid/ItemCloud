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
  ArrowPathIcon
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

function StatCard({ icon, label, value, color = 'blue', onClick }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div 
      className={`glass-gradient rounded-xl p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-xl ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white mb-3 shadow-lg`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Badge({ children, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

function ActionButton({ icon, label, onClick, variant = 'default', disabled, loading }) {
  const variants = {
    default: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
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

function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
        </div>
      ))}
    </div>
  );
}

function Toast({ message, type = 'info', onClose }) {
  const types = {
    success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-300',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 animate-slideUp max-w-md px-4 py-3 rounded-xl border-l-4 shadow-xl ${types[type]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
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

  // Real-time data loading
  useEffect(() => {
    const unsubscribers = [];

    // Users
    const usersUnsub = onSnapshot(collection(db, 'Users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    unsubscribers.push(usersUnsub);

    // Items
    const itemsUnsub = onSnapshot(
      query(collection(db, 'LostItems'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );
    unsubscribers.push(itemsUnsub);

    // Requests
    const requestsUnsub = onSnapshot(
      query(collection(db, 'EditRequests'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    unsubscribers.push(requestsUnsub);

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  // Statistics
  const stats = useMemo(() => {
    const pendingRequests = requests.filter(r => r.status !== 'approved' && r.status !== 'denied').length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const lostItems = items.filter(i => i.status === 'lost').length;
    const claimedItems = items.filter(i => i.status === 'claimed').length;

    return { pendingRequests, adminUsers, lostItems, claimedItems, totalUsers: users.length };
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

  // Toast helper
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  // Action handlers
  const handleRecapture = useCallback(async (box, itemId) => {
    const key = `recapture-${itemId}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      const url = await recapture(box);
      if (url && itemId) {
        await updateItem(itemId, { imageUrl: url, updatedAt: new Date() });
      }
      showToast('Photo captured successfully', 'success');
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

  const updateItemStatus = useCallback(async (id, status) => {
    const key = `status-${id}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      await updateItem(id, { status });
      showToast(`Item status updated to ${status}`, 'success');
    } catch (e) {
      showToast(e?.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [showToast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Admin Control Panel
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage users, items, and system settings
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          label="Pending Requests"
          value={stats.pendingRequests}
          color="red"
        />
        <StatCard
          icon={<UserIcon className="w-6 h-6" />}
          label="Total Users"
          value={stats.totalUsers}
          color="blue"
        />
        <StatCard
          icon={<ShieldCheckIcon className="w-6 h-6" />}
          label="Admin Users"
          value={stats.adminUsers}
          color="purple"
        />
        <StatCard
          icon={<CubeIcon className="w-6 h-6" />}
          label="Lost Items"
          value={stats.lostItems}
          color="amber"
        />
        <StatCard
          icon={<CheckIcon className="w-6 h-6" />}
          label="Claimed Items"
          value={stats.claimedItems}
          color="green"
        />
      </div>

      {/* Profile Edit Requests */}
      <section className="glass-solid rounded-2xl p-6">
        <SectionHeader
          icon={<ClockIcon className="w-5 h-5" />}
          title="Profile Edit Requests"
          subtitle={`${requests.filter(r => !r.status || r.status === 'pending').length} pending`}
        />

        {requests.length === 0 ? (
          <div className="text-center py-12">
            <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No pending requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Requested</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {requests.map(r => {
                  const relTime = getRelativeTime(r.createdAt);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono text-xs">{r.uid?.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm">{r.email || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div>{formatTimestamp(r.createdAt)}</div>
                        {relTime && <div className="text-xs text-slate-500">{relTime}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={r.status === 'approved' ? 'green' : 'amber'}>
                          {r.status || 'pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <ActionButton
                            icon={<CheckIcon className="w-4 h-4" />}
                            label="Approve"
                            onClick={() => approveRequest(r)}
                            variant="success"
                            disabled={r.status === 'approved'}
                            loading={actionLoading[`approve-${r.id}`]}
                          />
                          <ActionButton
                            icon={<XMarkIcon className="w-4 h-4" />}
                            label="Deny"
                            onClick={() => denyRequest(r)}
                            variant="danger"
                            loading={actionLoading[`deny-${r.id}`]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Users Management */}
      <section className="glass-solid rounded-2xl p-6">
        <SectionHeader
          icon={<UserIcon className="w-5 h-5" />}
          title="User Management"
          subtitle={`${users.length} total users`}
        />

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm">{u.email || '—'}</td>
                  <td className="px-4 py-3 text-sm">{u.fullName || u.displayName || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.role === 'admin' ? 'purple' : 'blue'}>
                      {u.role || 'user'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2 flex-wrap">
                      <ActionButton
                        icon={<ShieldCheckIcon className="w-4 h-4" />}
                        label="Make Admin"
                        onClick={() => setRole(u.id, 'admin')}
                        variant="primary"
                        disabled={u.role === 'admin'}
                        loading={actionLoading[`role-${u.id}`]}
                      />
                      <ActionButton
                        icon={<UserIcon className="w-4 h-4" />}
                        label="Make User"
                        onClick={() => setRole(u.id, 'user')}
                        variant="default"
                        disabled={u.role === 'user' || !u.role}
                        loading={actionLoading[`role-${u.id}`]}
                      />
                      <ActionButton
                        icon={<TrashIcon className="w-4 h-4" />}
                        label="Delete"
                        onClick={() => removeUser(u.id, u.email)}
                        variant="danger"
                        loading={actionLoading[`delete-user-${u.id}`]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lost Items Management */}
      <section className="glass-solid rounded-2xl p-6">
        <SectionHeader
          icon={<CubeIcon className="w-5 h-5" />}
          title="Lost Items Management"
          subtitle={`${filteredItems.length} items`}
          action={
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
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
          <div className="text-center py-12">
            <CubeIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredItems.map(it => (
              <div key={it.id} className="flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                {it.imageUrl ? (
                  <img
                    src={it.imageUrl}
                    alt={it.itemID || it.id}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <PhotoIcon className="w-12 h-12 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color="blue">{it.itemID || it.id}</Badge>
                    <Badge color={it.status === 'claimed' ? 'green' : it.status === 'lost' ? 'amber' : 'slate'}>
                      {it.status || 'lost'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    📍 {it.boxId || it.box || '—'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      icon={<PhotoIcon className="w-4 h-4" />}
                      label="Recapture B1"
                      onClick={() => handleRecapture('box1', it.id)}
                      variant="default"
                      loading={actionLoading[`recapture-${it.id}`]}
                    />
                    <ActionButton
                      icon={<PhotoIcon className="w-4 h-4" />}
                      label="Recapture B2"
                      onClick={() => handleRecapture('box2', it.id)}
                      variant="default"
                      loading={actionLoading[`recapture-${it.id}`]}
                    />
                    <ActionButton
                      icon={<TrashIcon className="w-4 h-4" />}
                      label="Delete"
                      onClick={() => removeItem(it.id)}
                      variant="danger"
                      loading={actionLoading[`delete-item-${it.id}`]}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Box Controls */}
      <section className="glass-solid rounded-2xl p-6">
        <SectionHeader
          icon={<LockOpenIcon className="w-5 h-5" />}
          title="Emergency Box Controls"
          subtitle="Unlock boxes remotely for 15 seconds"
        />
        <div className="flex gap-4">
          <button
            onClick={() => handleUnlock('box1')}
            disabled={actionLoading['unlock-box1']}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold text-lg transition-all hover:scale-105 disabled:opacity-50"
          >
            {actionLoading['unlock-box1'] ? (
              <ArrowPathIcon className="w-6 h-6 animate-spin" />
            ) : (
              <LockOpenIcon className="w-6 h-6" />
            )}
            Unlock Box 1
          </button>
          <button
            onClick={() => handleUnlock('box2')}
            disabled={actionLoading['unlock-box2']}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-lg transition-all hover:scale-105 disabled:opacity-50"
          >
            {actionLoading['unlock-box2'] ? (
              <ArrowPathIcon className="w-6 h-6 animate-spin" />
            ) : (
              <LockOpenIcon className="w-6 h-6" />
            )}
            Unlock Box 2
          </button>
        </div>
      </section>
    </div>
  );
}