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
import {
  QuestionMarkCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  SparklesIcon,
  UserIcon,
  CubeIcon,
  MapPinIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

// ============= UTILITY COMPONENTS =============

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
    <div className={`fixed top-4 right-4 z-50 animate-slideUp max-w-md px-4 py-3 rounded-xl border-l-4 shadow-2xl ${types[type]}`}>
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

function FAQCard({ icon, title, content, action }) {
  return (
    <div className="glass-solid rounded-xl p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">{content}</div>
          {action}
        </div>
      </div>
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
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}

// ============= ADMIN PANEL =============

function sortRows(arr) {
  const rank = (s) => (s === 'forwarded' ? 2 : s === 'in_progress' ? 1 : 0);
  const ts = (x) =>
    x.createdAt?.toMillis?.() ??
    (typeof x.createdAt === 'number' ? x.createdAt : 0);
  return [...arr].sort((a, b) => {
    const ra = rank(a.status), rb = rank(b.status);
    if (ra !== rb) return ra - rb;
    return ts(b) - ts(a);
  });
}

function ReportCard({ report, userMeta, itemMeta, onAction, busy, t }) {
  const [draft, setDraft] = useState(report.adminDraft || '');
  const [subject, setSubject] = useState('');
  const [expanded, setExpanded] = useState(false);

  const ts = report.createdAt?.toDate?.() ??
    (typeof report.createdAt === 'number' ? new Date(report.createdAt) : null);

  const metaUser = report.uid ? userMeta[report.uid] || {} : {};
  const metaItem = report.itemId ? itemMeta[report.itemId] || {} : {};

  const itemID = report.itemId || metaItem.itemID || '—';
  const box = report.box || report.boxId || metaItem.box || metaItem.boxId || '—';
  const contact = report.contact || metaUser.phone || metaUser.email || '—';
  const studentId = report.studentId || metaUser.matricNo || metaUser.studentId || '—';

  const isNew = !report.status || report.status === 'new';
  const isBusy = busy.id === report.id;

  return (
    <div className={`glass-solid rounded-xl p-6 transition-all duration-300 ${isNew ? 'ring-2 ring-red-500/50 animate-pulse' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${isNew ? 'bg-red-500' : 'bg-blue-500'} flex items-center justify-center`}>
            <ExclamationTriangleIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {report.title || t('help.admin.report', 'Report')}
              </h3>
              <Badge color={isNew ? 'red' : report.status === 'forwarded' ? 'green' : 'amber'}>
                {report.status || t('help.admin.new', 'new')}
              </Badge>
              {report.forwardCount > 0 && (
                <span className="text-xs text-slate-500">({report.forwardCount}x forwarded)</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {ts ? ts.toLocaleString() : '—'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Quick Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <CubeIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 dark:text-slate-400">Item:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{itemID}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPinIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 dark:text-slate-400">Box:</span>
          <span className="font-semibold text-slate-900 dark:text-white">{box}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <UserIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 dark:text-slate-400">UID:</span>
          <span className="font-mono text-xs text-slate-900 dark:text-white">{report.uid?.slice(0, 8) || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <PhoneIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 dark:text-slate-400">Contact:</span>
          <span className="text-slate-900 dark:text-white">{contact}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <IdentificationIcon className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 dark:text-slate-400">Student ID:</span>
          <span className="text-slate-900 dark:text-white">{studentId}</span>
        </div>
      </div>

      {/* Description */}
      {expanded && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">User's Report:</div>
            <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">
              {report.description || report.body || 'No description provided'}
            </p>
          </div>

          {/* Draft Editor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <DocumentTextIcon className="w-4 h-4 inline mr-1" />
              {t('help.admin.formalMsg', 'Formal message to user / HEP')}
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('help.admin.formalMsgPh', 'Write a formal message...')}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <EnvelopeIcon className="w-4 h-4 inline mr-1" />
              {t('help.admin.emailSubject', 'Email subject (optional)')}
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('help.admin.emailSubject', 'Email subject (optional)')}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onAction('progress', report)}
              disabled={isBusy || report.status === 'in_progress'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy && busy.action === 'progress' ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <ClockIcon className="w-4 h-4" />
              )}
              {t('help.admin.inProgress', 'In progress')}
            </button>

            <button
              onClick={() => onAction('draft', report, { draft })}
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-medium text-sm transition-all disabled:opacity-50"
            >
              {isBusy && busy.action === 'draft' ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <DocumentTextIcon className="w-4 h-4" />
              )}
              {t('help.admin.saveDraft', 'Save Draft')}
            </button>

            <button
              onClick={() => onAction('forward', report, { draft, subject })}
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-lg disabled:opacity-50"
            >
              {isBusy && busy.action === 'forward' ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="w-4 h-4" />
              )}
              {report.status === 'forwarded'
                ? t('help.admin.forwardAgain', 'Forward again')
                : t('help.admin.forward', 'Forward to HEP')}
            </button>

            <button
              onClick={() => onAction('resolve', report, { draft })}
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-lg disabled:opacity-50"
            >
              {isBusy && busy.action === 'resolve' ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="w-4 h-4" />
              )}
              {t('help.admin.resolveDelete', 'Resolve & Delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsAdminPanel({ t, showToast }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({ id: null, action: '' });
  const [userMeta, setUserMeta] = useState({});
  const [itemMeta, setItemMeta] = useState({});

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'Reports'), orderBy('createdAt', 'desc')));
      const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = sortRows(base);
      setRows(sorted);

      // Prefetch users
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

      // Prefetch items
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
    } catch (error) {
      console.error('Error loading reports:', error);
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAction(action, report, data = {}) {
    setBusy({ id: report.id, action });
    try {
      if (action === 'progress') {
        await setHepInProgress(report.id, user?.uid);
        setRows(prev => sortRows(prev.map(x => x.id === report.id ? { ...x, status: 'in_progress' } : x)));
        showToast('Status updated', 'success');
      } else if (action === 'draft') {
        await saveHepDraft(report.id, data.draft, user?.uid);
        setRows(prev => prev.map(x => x.id === report.id ? { ...x, adminDraft: data.draft } : x));
        showToast(t('help.admin.draftSaved', 'Draft saved'), 'success');
      } else if (action === 'forward') {
        await forwardHep(
          report.id,
          { subject: data.subject || t('help.admin.subjectFallback', { uid: report.uid || 'user' }), formalMessage: data.draft },
          user?.uid
        );
        setRows(prev => sortRows(prev.map(x =>
          x.id === report.id ? { ...x, status: 'forwarded', forwardCount: (x.forwardCount || 0) + 1 } : x
        )));
        showToast(t('help.admin.forwarded', 'Forwarded successfully'), 'success');
      } else if (action === 'resolve') {
        await resolveHep(report.id, { formalMessage: data.draft }, user?.uid);
        setRows(prev => prev.filter(x => x.id !== report.id));
        showToast('Report resolved', 'success');
      }
    } catch (error) {
      console.error('Action failed:', error);
      showToast(error.message || t('help.admin.fail', 'Failed'), 'error');
    } finally {
      setBusy({ id: null, action: '' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="glass-solid rounded-xl p-12 text-center">
        <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {t('help.admin.empty', 'No reports')}
        </h3>
        <p className="text-slate-500 dark:text-slate-400">All reports have been handled</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map(r => (
        <ReportCard
          key={r.id}
          report={r}
          userMeta={userMeta}
          itemMeta={itemMeta}
          onAction={handleAction}
          busy={busy}
          t={t}
        />
      ))}
    </div>
  );
}

// ============= MAIN PAGE =============

export default function HelpCenterPage() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const [openReport, setOpenReport] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const faqSteps = Array.isArray(t('help.howClaimSteps', { returnObjects: true }))
    ? t('help.howClaimSteps', { returnObjects: true })
    : [];

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

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <QuestionMarkCircleIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t('help.title', 'Help Center')}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">
              Find answers and get support
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FAQCard
          icon={<QuestionMarkCircleIcon className="w-6 h-6 text-white" />}
          title={t('help.howClaim', 'How do I claim an item?')}
          content={
            <ol className="list-decimal pl-5 space-y-2">
              {faqSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          }
        />

        <FAQCard
          icon={<ClockIcon className="w-6 h-6 text-white" />}
          title={t('help.expired', 'Code expired?')}
          content={
            <p>{t('help.expiredDesc', 'Request a new code from the item card after the timer ends.')}</p>
          }
        />

        <FAQCard
          icon={<ExclamationTriangleIcon className="w-6 h-6 text-white" />}
          title={t('help.reportTitle', 'Report an issue to HEP')}
          content={
            <p>
              {t('help.reportDesc', 'If you believe your item was taken by someone else, submit a report to HEP (Student Affairs).')}
            </p>
          }
          action={
            <button
              onClick={() => setOpenReport(true)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-medium text-sm shadow-lg transition-all"
            >
              <ExclamationTriangleIcon className="w-5 h-5" />
              {t('help.reportBtn', 'Report to HEP')}
            </button>
          }
        />

        <FAQCard
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />}
          title={t('help.moreQsTitle', 'More questions?')}
          content={
            <p>
              {t('help.moreQsDesc', 'Use the chat bubble (bottom-right) to ask questions. The assistant suggests answers from our FAQ or directs you to the right place.')}
            </p>
          }
        />
      </div>

      {/* Admin Panel */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <ShieldCheckIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('help.hepAdminTitle', 'HEP Reports (Admin)')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage user reports and forward to HEP
              </p>
            </div>
          </div>
          <ReportsAdminPanel t={t} showToast={showToast} />
        </div>
      )}

      {/* Modals */}
      {openReport && <ReportToHepModal onClose={() => setOpenReport(false)} />}
      <ChatAssistantWidget />
    </div>
  );
}