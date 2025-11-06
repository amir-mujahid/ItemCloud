// src/components/support/ReportToHepModal.jsx
import { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { notifyAdmins } from '../../services/notify';
import { useI18n } from '../../i18n';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  UserIcon,
  IdentificationIcon,
  EnvelopeIcon,
  CubeIcon,
  MapPinIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

async function waitForAuthUser() {
  if (auth.currentUser) return auth.currentUser;
  return new Promise(resolve => {
    const off = onAuthStateChanged(auth, u => { off(); resolve(u); });
  });
}

export default function ReportToHepModal({ onClose }) {
  const { t } = useI18n();
  const u0 = auth.currentUser;

  const [form, setForm] = useState({
    name: u0?.displayName || '',
    studentId: '',
    email: u0?.email || '',
    itemID: '',
    boxId: '',
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    setMsg('');
    if (!form.name || !form.email || !form.description) {
      setMsg(t('help.reportValidation', 'Please fill in all required fields.'));
      return;
    }

    try {
      setBusy(true);

      const u = await waitForAuthUser();
      if (!u) {
        setMsg(t('common.signInRequired', 'Please sign in first.'));
        setBusy(false);
        return;
      }
      await u.getIdToken(true);

      await addDoc(collection(db, 'Reports'), {
        ...form,
        itemId: form.itemID || null,
        box: form.boxId || null,
        uid: u.uid,
        status: 'new',
        createdAt: serverTimestamp(),
      });

      try {
        await notifyAdmins({
          title: 'New HEP report',
          message: `${form.name || 'A user'} submitted a report for item ${form.itemID || '—'}.`,
          link: '/help',
        });
      } catch (e) {
        console.debug('[notifyAdmins] ignored:', e?.message || e);
      }

      setMsg(t('help.reportOk', 'Your report has been submitted to HEP.'));
      setTimeout(() => onClose?.(), 900);
    } catch (e) {
      console.error('[Report submit] ', e);
      const code = e?.code || '';
      if (code === 'permission-denied') {
        setMsg(t('errors.permDenied', 'Missing or insufficient permissions.'));
      } else {
        setMsg(e?.message || t('help.reportFail', 'Failed to submit report.'));
      }
    } finally {
      setBusy(false);
    }
  }

  const nodeRef = useRef(null);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Draggable but centered initially */}
      <Draggable
        nodeRef={nodeRef}
        handle=".hep-drag-handle"
        cancel="input,textarea,button,.no-drag"
        bounds="parent"
      >
        <div
          ref={nodeRef}
          className="relative w-full max-w-2xl glass-gradient rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-scaleIn"
          role="dialog"
          aria-modal="true"
          style={{ willChange: 'transform' }}
        >
          {/* Header */}
          <div className="hep-drag-handle cursor-move flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('help.reportBtn', 'Report to HEP')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <XMarkIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <UserIcon className="w-4 h-4 inline mr-1" />
                  {t('help.fName', 'Full name')} *
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <IdentificationIcon className="w-4 h-4 inline mr-1" />
                  {t('help.studentId', 'Student ID')}
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Enter your student ID"
                  value={form.studentId}
                  onChange={e => setForm({ ...form, studentId: e.target.value })}
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                {t('help.email', 'Email')} *
              </label>
              <input
                type="email"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="your.email@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <CubeIcon className="w-4 h-4 inline mr-1" />
                  {t('help.itemId', 'Item ID (if known)')}
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="e.g., item123"
                  value={form.itemID}
                  onChange={e => setForm({ ...form, itemID: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <MapPinIcon className="w-4 h-4 inline mr-1" />
                  {t('help.boxId', 'Box ID (if known)')}
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="e.g., box1"
                  value={form.boxId}
                  onChange={e => setForm({ ...form, boxId: e.target.value })}
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                {t('help.desc', 'Describe the issue (what happened?)')} *
              </label>
              <textarea
                rows={5}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-shadow"
                placeholder="Please describe the issue in detail..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {msg && (
              <div
                className={`p-3 rounded-lg text-sm animate-fadeIn ${
                  msg.includes('submitted')
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                }`}
              >
                {msg}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  {t('common.sending', 'Sending...')}
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5" />
                  {t('common.submit', 'Submit')}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={busy}
              className="px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </Draggable>
    </div>
  );
}