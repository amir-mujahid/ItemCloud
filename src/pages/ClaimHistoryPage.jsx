import { useEffect, useState } from 'react';
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

function fmt(ts) {
  try {
    const d =
      ts?.toDate?.() ??
      (typeof ts === 'number' ? new Date(ts) : ts instanceof Date ? ts : null);
    return d ? d.toLocaleString() : '—';
  } catch {
    return '—';
  }
}

export default function ClaimHistoryPage() {
  const { t } = useI18n();

  const [role, setRole] = useState('user');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

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
              status: v.status || '',
            };
          });

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

  const empty = !loading && rows.length === 0;

  // Excel export rows
  const exportRows = rows.map((r) => ({
    id: r.id,
    uid: r.uid,
    itemID: r.itemID,
    box: r.box,
    claimantName: r.claimantName,
    claimantMatric: r.claimantMatric,
    claimantPhone: r.claimantPhone,
    foundAt: fmt(r.foundAt),
    claimedAt: fmt(r.createdAt),
    status: r.status,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('claims.title')}</h1>
        {isAdmin && (
          <ExportButton
            rows={exportRows}
            filename={`claims-${new Date().toISOString().slice(0, 10)}.xlsx`}
          />
        )}
      </div>

      {/* let .glass set borders for both themes */}
      <div className="glass rounded-2xl glow-interactive overflow-hidden">
        {/* Mobile: horizontal scroll */}
        <div className="overflow-x-auto sm:overflow-visible">
          <table className="min-w-[1000px] sm:min-w-full text-sm border-collapse">
            {/* Header: light in light mode, dark in dark mode */}
            <thead className="bg-border-same text-white">
              <tr className="[&>th]:py-3 [&>th]:px-4 [&>th]:font-medium [&>th]:text-left [&>th]:whitespace-nowrap">
                <th className="border-r border-slate-300 dark:border-slate-700">
                  Timestamp of found item received
                </th>
                <th className="border-r border-slate-300 dark:border-slate-700">Location</th>
                <th className="border-r border-slate-300 dark:border-slate-700">Claimant's name</th>
                <th className="border-r border-slate-300 dark:border-slate-700">Claimant's Matric No</th>
                <th className="border-r border-slate-300 dark:border-slate-700">Claimant's Contact Number</th>
                <th>Timestamp of item claimed</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 [&>tr>td]:py-2 [&>tr>td]:px-4 [&>tr>td]:whitespace-nowrap">
              {loading && (
                <tr>
                  <td className="py-3 px-4 text-slate-500" colSpan={6}>Loading…</td>
                </tr>
              )}

              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900/40 dark:even:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <td className="border-r border-slate-200 dark:border-slate-700">{fmt(r.foundAt)}</td>
                  <td className="border-r border-slate-200 dark:border-slate-700">{r.box || '—'}</td>
                  <td className="border-r border-slate-200 dark:border-slate-700">{r.claimantName}</td>
                  <td className="border-r border-slate-200 dark:border-slate-700">{r.claimantMatric}</td>
                  <td className="border-r border-slate-200 dark:border-slate-700">{r.claimantPhone}</td>
                  <td>{fmt(r.createdAt)}</td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td className="py-3 px-4 text-slate-500" colSpan={6}>
                    {t('claims.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
