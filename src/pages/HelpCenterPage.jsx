// src/pages/HelpCenterPage.jsx
import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, getDocs, orderBy, query, doc, getDoc } from 'firebase/firestore';

import ReportToHepModal from '../components/support/ReportToHepModal';
import ChatAssistantWidget from '../components/support/ChatAssistantWidget';

import {
  setHepInProgress,
  saveHepDraft,
  resolveHep,
  forwardHep,
} from '../services/hep';

/* Utility: sort "forwarded" to the bottom, newest first within groups */
function sortRows(arr) {
  const rank = (s) => (s === 'forwarded' ? 2 : s === 'in_progress' ? 1 : 0);
  const ts = (x) =>
    x.createdAt?.toMillis?.() ??
    (typeof x.createdAt === 'number' ? x.createdAt : 0);
  return [...arr].sort((a, b) => {
    const ra = rank(a.status), rb = rank(b.status);
    if (ra !== rb) return ra - rb;
    return ts(b) - ts(a); // newest first in each bucket
  });
}

/* ---------------- Admin Panel ---------------- */
function ReportsAdminPanel() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busyId, setBusyId] = useState(null);
  const [busyAction, setBusyAction] = useState(''); // 'forward' | 'draft' | 'progress' | 'resolve'
  const [error, setError] = useState('');

  // Maps for extra metadata (Users, LostItems)
  const [userMeta, setUserMeta] = useState({}); // uid -> { fullName, matricNo, phone, email }
  const [itemMeta, setItemMeta] = useState({}); // itemId -> { box, boxId, itemID }

  // per-row flash message after success
  const [flash, setFlash] = useState({ id: null, text: '' });

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'Reports'), orderBy('createdAt', 'desc')));
      const base = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        _draft: d.data().adminDraft || '',
        _sub: '',
      }));
      const sorted = sortRows(base);
      setRows(sorted);

      // Prefetch related Users
      const uids = [...new Set(sorted.map(r => r.uid).filter(Boolean))];
      const userEntries = await Promise.all(
        uids.map(async (uid) => {
          try {
            const s = await getDoc(doc(db, 'Users', uid));
            return [uid, s.exists() ? s.data() : {}];
          } catch {
            return [uid, {}];
          }
        })
      );
      setUserMeta(Object.fromEntries(userEntries));

      // Prefetch LostItems
      const itemIds = [...new Set(sorted.map(r => r.itemId).filter(Boolean))];
      const itemEntries = await Promise.all(
        itemIds.map(async (iid) => {
          try {
            const s = await getDoc(doc(db, 'LostItems', iid));
            return [iid, s.exists() ? s.data() : {}];
          } catch {
            return [iid, {}];
          }
        })
      );
      setItemMeta(Object.fromEntries(itemEntries));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function replaceAndResort(mapper) {
    setRows(prev => sortRows(prev.map(mapper)));
  }

  async function makeInProgress(r) {
    setBusyId(r.id); setBusyAction('progress'); setError('');
    try {
      await setHepInProgress(r.id, user?.uid);
      replaceAndResort(x => x.id === r.id ? { ...x, status: 'in_progress' } : x);
    } catch (e) { setError(e.message || t('help.admin.fail')); }
    finally { setBusyId(null); setBusyAction(''); }
  }

  async function saveDraft(r) {
    setBusyId(r.id); setBusyAction('draft'); setError('');
    try {
      await saveHepDraft(r.id, r._draft, user?.uid);
      replaceAndResort(x => x.id === r.id ? { ...x, adminDraft: r._draft } : x);
      setFlash({ id: r.id, text: t('help.admin.draftSaved') });
      setTimeout(() => setFlash({ id: null, text: '' }), 2000);
    } catch (e) { setError(e.message || t('help.admin.fail')); }
    finally { setBusyId(null); setBusyAction(''); }
  }

  async function doResolve(r) {
    setBusyId(r.id); setBusyAction('resolve'); setError('');
    try {
      await resolveHep(r.id, { formalMessage: r._draft }, user?.uid);
      setRows(prev => prev.filter(x => x.id !== r.id)); // remove from view
    } catch (e) { setError(e.message || t('help.admin.fail')); }
    finally { setBusyId(null); setBusyAction(''); }
  }

  async function doForward(r) {
    setBusyId(r.id); setBusyAction('forward'); setError('');
    try {
      await forwardHep(
        r.id,
        { subject: r._sub || t('help.admin.subjectFallback', { uid: r.uid || 'user' }), formalMessage: r._draft },
        user?.uid
      );
      replaceAndResort(x =>
        x.id === r.id ? { ...x, status: 'forwarded', forwardCount: (x.forwardCount || 0) + 1 } : x
      );
      setFlash({ id: r.id, text: t('help.admin.forwarded') });
      setTimeout(() => setFlash({ id: null, text: '' }), 2500);
    } catch (e) { setError(e.message || t('help.admin.fail')); }
    finally { setBusyId(null); setBusyAction(''); }
  }

  if (loading) return <div className="text-sm text-slate-500">{t('help.admin.loading')}</div>;
  if (rows.length === 0) return <div className="text-sm text-slate-500">{t('help.admin.empty')}</div>;

  return (
    <div className="space-y-4">
      {rows.map(r => {
        const ts = r.createdAt?.toDate?.() ??
          (typeof r.createdAt === 'number' ? new Date(r.createdAt) : null);

        const metaUser = r.uid ? userMeta[r.uid] || {} : {};
        const metaItem = r.itemId ? itemMeta[r.itemId] || {} : {};

        const itemID = r.itemId || metaItem.itemID || '—';
        const box    = r.box || r.boxId || metaItem.box || metaItem.boxId || '—';
        const contact = r.contact || metaUser.phone || metaUser.email || '—';
        const studentId = r.studentId || metaUser.matricNo || metaUser.studentId || '—';

        const isBusy = busyId === r.id;
        const forwardLabel = isBusy && busyAction === 'forward'
          ? t('help.admin.forwarding')
          : (r.status === 'forwarded' ? t('help.admin.forwardAgain') : t('help.admin.forward'));

        return (
          <div key={r.id} className="glass-solid p-4">
            <div className="flex items-center gap-2">
              <div className="font-medium">{r.title || t('help.admin.report')}</div>
              <span className="text-[11px] px-2 rounded-full border">
                {r.status || t('help.admin.new')}
              </span>
              {r.forwardCount > 0 && (
                <span className="text-[11px] text-slate-500">({r.forwardCount}x)</span>
              )}
            </div>

            <div className="text-xs opacity-70">
              {`${ts ? ts.toLocaleString() : '—'} • ${r.status || t('help.admin.new')}`}
            </div>

            {/* quick details row */}
            <div className="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-sm">
              <div><span className="text-slate-500">{t('help.admin.item')}:</span> <b>{itemID}</b></div>
              <div><span className="text-slate-500">{t('help.admin.box')}:</span> {box}</div>
              <div><span className="text-slate-500">{t('help.admin.uid')}:</span> {r.uid || '—'}</div>
              <div><span className="text-slate-500">{t('help.admin.contact')}:</span> {contact}</div>
              <div><span className="text-slate-500">{t('help.admin.studentId')}:</span> {studentId}</div>
            </div>

            <div className="mt-2 text-sm whitespace-pre-wrap">{r.description || r.body || ''}</div>

            {/* Draft editor */}
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-500">{t('help.admin.formalMsg')}</label>
              <textarea
                className="mt-1 w-full rounded-lg border p-2 text-sm dark:bg-slate-900"
                rows={4}
                value={r._draft}
                onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, _draft: e.target.value } : x))}
                placeholder={t('help.admin.formalMsgPh')}
              />
            </div>

            {/* Subject only */}
            <div className="mt-2">
              <input
                className="w-full rounded-lg border p-2 text-sm dark:bg-slate-900"
                value={r._sub || ''}
                onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, _sub: e.target.value } : x))}
                placeholder={t('help.admin.emailSubject')}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => makeInProgress(r)}
                disabled={isBusy || r.status === 'in_progress'}
                className="px-3 py-1 rounded border"
              >
                {isBusy && busyAction === 'progress' ? t('help.admin.updating') : t('help.admin.inProgress')}
              </button>

              <button
                onClick={() => saveDraft(r)}
                disabled={isBusy}
                className="px-3 py-1 rounded border"
              >
                {isBusy && busyAction === 'draft' ? t('help.admin.saving') : t('help.admin.saveDraft')}
              </button>

              <button
                onClick={() => doForward(r)}
                disabled={isBusy}
                className="px-3 py-1 rounded bg-blue-600 text-white"
              >
                {forwardLabel}
              </button>

              <button
                onClick={() => doResolve(r)}
                disabled={isBusy}
                className="px-3 py-1 rounded bg-emerald-600 text-white"
              >
                {isBusy && busyAction === 'resolve' ? t('help.admin.resolving') : t('help.admin.resolveDelete')}
              </button>
            </div>

            {flash.id === r.id && (
              <div className="mt-2 text-xs text-emerald-700">{flash.text}</div>
            )}
            {error && <div className="mt-2 text-xs text-rose-600">{error}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function HelpCenterPage() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const [openReport, setOpenReport] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('help.title')}</h1>

      {/* FAQ grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-solid p-5">
          <div className="font-semibold mb-2">{t('help.howClaim')}</div>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {(t('help.howClaimSteps', { returnObjects: true }) || []).map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>

        <div className="glass-solid p-5">
          <div className="font-semibold mb-2">{t('help.expired')}</div>
          <p className="text-sm">{t('help.expiredDesc')}</p>
        </div>

        <div className="glass-solid p-5">
          <div className="font-semibold mb-2">{t('help.reportTitle', 'Report an issue to HEP')}</div>
          <p className="text-sm mb-3">
            {t('help.reportDesc','If you believe your item was taken by someone else, submit a report to HEP (Student Affairs).')}
          </p>
          <button className="btn-primary glow-interactive" onClick={() => setOpenReport(true)}>
            {t('help.reportBtn', 'Report to HEP')}
          </button>
        </div>

        <div className="glass-solid p-5">
          <div className="font-semibold mb-2">{t('help.moreQsTitle','More questions?')}</div>
          <p className="text-sm">
            {t('help.moreQsDesc','Use the chat bubble (bottom-right) to ask questions. The assistant suggests answers from our FAQ or directs you to the right place.')}
          </p>
        </div>
      </div>

      {/* Admin only panel */}
      {isAdmin && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{t('help.hepAdminTitle')}</h2>
          <ReportsAdminPanel />
        </div>
      )}

      {openReport && <ReportToHepModal onClose={() => setOpenReport(false)} />}
      <ChatAssistantWidget />
    </div>
  );
}
