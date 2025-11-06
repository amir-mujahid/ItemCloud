// src/pages/ClaimHistoryPage.jsx
import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import ExportButton from '../components/ExportButton';
import {
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CheckCircleIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ============= UTILITY FUNCTIONS =============

function formatTimestamp(ts) {
  try {
    const d =
      ts?.toDate?.() ??
      (typeof ts === 'number' ? new Date(ts) : ts instanceof Date ? ts : null);
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
    const d =
      ts?.toDate?.() ??
      (typeof ts === 'number' ? new Date(ts) : ts instanceof Date ? ts : null);
    if (!d) return null;

    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return null;
  } catch {
    return null;
  }
}

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'successful':
    case 'completed':
    case 'claimed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'cancelled':
    case 'expired':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
  }
}

function getStatusIcon(status) {
  switch (status?.toLowerCase()) {
    case 'successful':
    case 'completed':
    case 'claimed':
      return <CheckCircleIcon className="w-4 h-4" />;
    case 'pending':
      return <ClockIcon className="w-4 h-4" />;
    case 'cancelled':
    case 'expired':
      return <XMarkIcon className="w-4 h-4" />;
    default:
      return null;
  }
}

// ============= COMPONENTS =============

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
      <div className="flex items-center gap-3">
        <SparklesIcon className="w-5 h-5" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="glass-solid rounded-xl p-5 hover:scale-105 transition-transform duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            <span className="text-xs font-semibold">+{trend}%</span>
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/12"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
        </div>
      ))}
    </div>
  );
}

function ClaimRow({ claim, index }) {
  const relTime = getRelativeTime(claim.createdAt);

  return (
    <tr
      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">
              {formatTimestamp(claim.foundAt)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              {claim.itemID}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold shadow-lg">
          <MapPinIcon className="w-4 h-4" />
          {claim.box}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {claim.claimantName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {claim.claimantName}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="text-sm text-slate-700 dark:text-slate-300 font-mono font-medium">
          {claim.claimantMatric}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">
          {claim.claimantPhone}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="text-sm font-medium text-slate-900 dark:text-white">
          {formatTimestamp(claim.createdAt)}
        </div>
        {relTime && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {relTime}
          </div>
        )}
      </td>
      <td className="py-4 px-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(claim.status)}`}>
          {getStatusIcon(claim.status)}
          {claim.status || 'Completed'}
        </span>
      </td>
    </tr>
  );
}

// ============= MAIN COMPONENT =============

export default function ClaimHistoryPage() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();

  const [role, setRole] = useState('user');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Fetch user role
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setRole('user');
        setRows([]);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'Users', u.uid));
        const r = snap.exists() ? snap.data()?.role : null;
        setRole(r === 'admin' ? 'admin' : 'user');
      } catch {
        setRole('user');
      }
    });
    return unsub;
  }, []);

  // Fetch claims data
  useEffect(() => {
    let off = () => {};
    (async () => {
      const u = auth.currentUser;
      if (!u) return;

      const base = collection(db, 'Claim');
      const q =
        role === 'admin'
          ? query(base, orderBy('createdAt', 'desc'))
          : query(base, where('uid', '==', u.uid), orderBy('createdAt', 'desc'));

      off = onSnapshot(
        q,
        async (snap) => {
          const claims = snap.docs.map((d) => {
            const v = d.data() || {};
            return {
              id: d.id,
              uid: v.uid || '',
              itemID: v.itemID || '',
              box: v.box || v.boxId || '',
              createdAt: v.createdAt ?? null,
              status: v.status || 'completed',
              attemptId: v.attemptId || '',
            };
          });

          // Batch fetch users
          const uids = [...new Set(claims.map((c) => c.uid).filter(Boolean))];
          const userMap = {};
          await Promise.all(
            uids.map(async (uid) => {
              try {
                const us = await getDoc(doc(db, 'Users', uid));
                if (us.exists()) userMap[uid] = us.data();
              } catch {}
            })
          );

          // Batch fetch items
          const itemIds = [...new Set(claims.map((c) => c.itemID).filter(Boolean))];
          const foundMap = {};
          await Promise.all(
            itemIds.map(async (iid) => {
              try {
                const ls = await getDoc(doc(db, 'LostItems', iid));
                if (ls.exists()) {
                  const v = ls.data();
                  foundMap[iid] = v?.createdAt ?? null;
                }
              } catch {}
            })
          );

          // Combine data
          const full = claims.map((c) => ({
            ...c,
            claimantName:
              userMap[c.uid]?.fullName ||
              userMap[c.uid]?.name ||
              userMap[c.uid]?.displayName ||
              '—',
            claimantPhone:
              userMap[c.uid]?.phone ||
              userMap[c.uid]?.contact ||
              userMap[c.uid]?.tel ||
              '—',
            claimantMatric: userMap[c.uid]?.matricNo || '—',
            foundAt: foundMap[c.itemID] ?? null,
          }));

          setRows(full);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading claims:', error);
          showToast('Failed to load claims', 'error');
          setLoading(false);
        }
      );
    })();

    return () => off();
  }, [role]);

  // Statistics
  const stats = useMemo(() => {
    const total = rows.length;
    const last24h = rows.filter((r) => {
      if (!r.createdAt) return false;
      const d = r.createdAt.toDate?.() || new Date(r.createdAt);
      return Date.now() - d.getTime() < 86400000;
    }).length;

    const last7d = rows.filter((r) => {
      if (!r.createdAt) return false;
      const d = r.createdAt.toDate?.() || new Date(r.createdAt);
      return Date.now() - d.getTime() < 604800000;
    }).length;

    const locations = [...new Set(rows.map((r) => r.box).filter(Boolean))];
    const byLocation = {};
    locations.forEach((loc) => {
      byLocation[loc] = rows.filter((r) => r.box === loc).length;
    });
    const mostActive = locations.sort((a, b) => byLocation[b] - byLocation[a])[0] || '—';

    const successRate = total > 0 
      ? Math.round((rows.filter(r => ['successful', 'completed', 'claimed'].includes(r.status?.toLowerCase())).length / total) * 100)
      : 0;

    return { total, last24h, last7d, locations: locations.length, mostActive, successRate };
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter((r) => r.box === locationFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.claimantName.toLowerCase().includes(q) ||
          r.claimantMatric.toLowerCase().includes(q) ||
          r.claimantPhone.includes(q) ||
          r.box.toLowerCase().includes(q) ||
          r.itemID.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [rows, searchQuery, locationFilter, statusFilter]);

  // Unique locations
  const uniqueLocations = useMemo(() => {
    return [...new Set(rows.map((r) => r.box).filter(Boolean))].sort();
  }, [rows]);

  // Export rows
  const exportRows = filteredRows.map((r) => ({
    claimId: r.id,
    attemptId: r.attemptId,
    itemID: r.itemID,
    location: r.box,
    claimantName: r.claimantName,
    claimantMatric: r.claimantMatric,
    claimantPhone: r.claimantPhone,
    itemFoundAt: formatTimestamp(r.foundAt),
    claimedAt: formatTimestamp(r.createdAt),
    status: r.status,
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="glass-gradient rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <ChartBarIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {t('claims.title', 'Claim History')}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">
                {role === 'admin' ? 'All claims across the system' : 'Your claimed items'}
              </p>
            </div>
          </div>

          {isAdmin && (
            <ExportButton
              rows={exportRows}
              filename={`claim-history-${new Date().toISOString().slice(0, 10)}.xlsx`}
            />
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircleIcon className="w-6 h-6 text-white" />}
          label="Total Claims"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<ClockIcon className="w-6 h-6 text-white" />}
          label="Last 24 Hours"
          value={stats.last24h}
          trend={stats.last7d > 0 ? Math.round((stats.last24h / stats.last7d) * 100) : 0}
          color="green"
        />
        <StatCard
          icon={<MapPinIcon className="w-6 h-6 text-white" />}
          label="Active Locations"
          value={stats.locations}
          color="purple"
        />
        <StatCard
          icon={<ChartBarIcon className="w-6 h-6 text-white" />}
          label="Success Rate"
          value={`${stats.successRate}%`}
          color="amber"
        />
      </div>

      {/* Search and Filters */}
      <div className="glass-solid rounded-xl p-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, matric, phone, location, or item ID..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Location Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <MapPinIcon className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setLocationFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                    locationFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All
                </button>
                {uniqueLocations.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setLocationFilter(loc)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                      locationFilter === loc
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <FunnelIcon className="w-4 h-4 inline mr-1" />
                Status
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('successful')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                    statusFilter === 'successful'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Successful
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('cancelled')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                    statusFilter === 'cancelled'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Cancelled
                </button>
              </div>
            </div>
          </div>

          {/* Filter Summary */}
          {(searchQuery || locationFilter !== 'all' || statusFilter !== 'all') && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing <span className="font-semibold">{filteredRows.length}</span> of{' '}
                <span className="font-semibold">{rows.length}</span> claims
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocationFilter('all');
                  setStatusFilter('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-solid rounded-xl overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <ChartBarIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No claims found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
              {searchQuery || locationFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No items have been claimed yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                  <th className="py-4 px-4 text-left font-semibold text-sm">Item Found</th>
                  <th className="py-4 px-4 text-left font-semibold text-sm">Location</th>
                  <th className="py-4 px-4 text-left font-semibold text-sm">Claimant</th>
                  <th className="py-4 px-4 text-left font-semibold text-sm">Matric No</th>
                  <th className="py-4 px-4 text-left font-semibold text-sm">Contact</th>
                  <th className="py-4 px-4 text-left font-semibold text-sm">Claimed At</th>
                  <th className="py-4 px-4 text-left font-semibold text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRows.map((claim, index) => (
                  <ClaimRow key={claim.id} claim={claim} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && filteredRows.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <p>
            Showing {filteredRows.length} {filteredRows.length === 1 ? 'claim' : 'claims'}
            {role === 'admin' && ' • Admin view'}
          </p>
          <p className="text-xs">
            Last updated: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  );
}