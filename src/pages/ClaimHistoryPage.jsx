// src/pages/ClaimHistoryPage.jsx
import { useEffect, useState, useMemo, useCallback } from 'react';
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

// ============= UTILITY FUNCTIONS =============

function formatTimestamp(ts) {
  try {
    const d =
      ts?.toDate?.() ??
      (typeof ts === 'number' ? new Date(ts) : ts instanceof Date ? ts : null);
    if (!d) return '—';
    
    // Format: Nov 6, 2025, 5:09 PM
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

// ============= COMPONENTS =============

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[...Array(5)].map((_, i) => (
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

function StatsCard({ icon, label, value, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="glass-solid rounded-xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
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

  // Fetch claims data (optimized with batching)
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
        () => setLoading(false)
      );
    })();

    return () => off();
  }, [role]);

  // Computed statistics
  const stats = useMemo(() => {
    const total = rows.length;
    const last24h = rows.filter((r) => {
      if (!r.createdAt) return false;
      const d = r.createdAt.toDate?.() || new Date(r.createdAt);
      return Date.now() - d.getTime() < 86400000;
    }).length;

    const locations = [...new Set(rows.map((r) => r.box).filter(Boolean))];
    const byLocation = {};
    locations.forEach((loc) => {
      byLocation[loc] = rows.filter((r) => r.box === loc).length;
    });
    const mostActive = locations.sort((a, b) => byLocation[b] - byLocation[a])[0] || '—';

    return { total, last24h, locations: locations.length, mostActive };
  }, [rows]);

  // Filtered and searched rows
  const filteredRows = useMemo(() => {
    let filtered = rows;

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter((r) => r.box === locationFilter);
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
          r.id.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [rows, searchQuery, locationFilter]);

  // Excel export rows
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

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    return [...new Set(rows.map((r) => r.box).filter(Boolean))].sort();
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('claims.title') || 'Claim History'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {role === 'admin' ? 'All claims across the system' : 'Your claimed items'}
          </p>
        </div>
        {isAdmin && (
          <ExportButton
            rows={exportRows}
            filename={`claim-history-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          label="Total Claims"
          value={stats.total}
          color="blue"
        />
        <StatsCard
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          label="Last 24 Hours"
          value={stats.last24h}
          color="green"
        />
        <StatsCard
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          label="Active Locations"
          value={stats.locations}
          color="purple"
        />
        <StatsCard
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
          label="Most Active"
          value={stats.mostActive}
          color="amber"
        />
      </div>

      {/* Search and Filters */}
      <div className="glass-solid rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by name, matric, phone, or location..."
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            <FilterButton active={locationFilter === 'all'} onClick={() => setLocationFilter('all')}>
              All Locations
            </FilterButton>
            {uniqueLocations.map((loc) => (
              <FilterButton
                key={loc}
                active={locationFilter === loc}
                onClick={() => setLocationFilter(loc)}
              >
                {loc}
              </FilterButton>
            ))}
          </div>
        </div>
        {(searchQuery || locationFilter !== 'all') && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <p className="text-slate-600 dark:text-slate-400">
              Showing <span className="font-semibold">{filteredRows.length}</span> of{' '}
              <span className="font-semibold">{rows.length}</span> claims
            </p>
            {(searchQuery || locationFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocationFilter('all');
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-solid rounded-xl overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              No claims found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
              {searchQuery || locationFilter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'No items have been claimed yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              {/* Header */}
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

              {/* Body */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRows.map((r, idx) => {
                  const relTime = getRelativeTime(r.createdAt);
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {formatTimestamp(r.foundAt)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          ID: {r.itemID}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {r.box}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {r.claimantName}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                          {r.claimantMatric}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                          {r.claimantPhone}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-slate-900 dark:text-white">
                          {formatTimestamp(r.createdAt)}
                        </div>
                        {relTime && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {relTime}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                          {r.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      {!loading && filteredRows.length > 0 && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredRows.length} {filteredRows.length === 1 ? 'claim' : 'claims'}
          {role === 'admin' && ' • Admin view'}
        </div>
      )}
    </div>
  );
}