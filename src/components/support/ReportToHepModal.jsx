// src/components/support/ReportToHepModal.jsx
import { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { notifyAdmins } from '../../services/notify';
import { useI18n } from '../../i18n';

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
      await u.getIdToken(true); // refresh

      // create report
      await addDoc(collection(db, 'Reports'), {
        ...form,
        
        itemId: form.itemID || null,
        box: form.boxId || null,
        uid: u.uid,
        status: 'new',
        createdAt: serverTimestamp(),
      });

      // ping admins (best-effort)
      try {
        await notifyAdmins({
          title: 'New HEP report',
          message: `${form.name || 'A user'} submitted a report for item ${form.itemID || '—'}.`,
          link: '/help',
        });
      } catch (e) {
        // do not block UX on notification failure
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
    <div className="fixed inset-0 z-[10000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <Draggable nodeRef={nodeRef} handle=".hep-drag-handle" cancel="input,textarea,button,.no-drag">
        <div
          ref={nodeRef}
          className="absolute right-4 md:right-6 top-[56px] w-[min(92vw,34rem)] glass rounded-xl shadow-xl p-5 border"
          role="dialog" aria-modal="true"
        >
          <div className="hep-drag-handle cursor-move flex items-center justify-between mb-3 border-b pb-2">
            <div className="text-lg font-semibold">{t('help.reportBtn', 'Report to HEP')}</div>
            <button className="rounded-lg border px-3 py-1 text-sm" onClick={onClose} aria-label={t('common.close','Close')}>✕</button>
          </div>

          <div className="grid gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <input className="px-3 py-2 rounded-lg border dark:bg-slate-800"
                     placeholder={t('help.fName','Full name')}
                     value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
              <input className="px-3 py-2 rounded-lg border dark:bg-slate-800"
                     placeholder={t('help.studentId','Student ID')}
                     value={form.studentId} onChange={e=>setForm({...form, studentId:e.target.value})}/>
            </div>

            <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" type="email"
                   placeholder={t('help.email','Email')}
                   value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>

            <div className="grid md:grid-cols-2 gap-3">
              <input className="px-3 py-2 rounded-lg border dark:bg-slate-800"
                     placeholder={t('help.itemId','Item ID (if known)')}
                     value={form.itemID} onChange={e=>setForm({...form, itemID:e.target.value})}/>
              <input className="px-3 py-2 rounded-lg border dark:bg-slate-800"
                     placeholder={t('help.boxId','Box ID (if known)')}
                     value={form.boxId} onChange={e=>setForm({...form, boxId:e.target.value})}/>
            </div>

            <textarea rows={5} className="px-3 py-2 rounded-lg border dark:bg-slate-800"
                      placeholder={t('help.desc','Describe the issue (what happened?)')}
                      value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>

            {!!msg && <div className="text-sm text-slate-700 dark:text-slate-300">{msg}</div>}

            <div className="flex items-center gap-2">
              <button className="btn-primary glow-interactive disabled:opacity-60" disabled={busy} onClick={submit}>
                {busy ? t('common.sending','Sending…') : t('common.submit','Submit')}
              </button>
              <button className="rounded-lg border px-4 py-2" onClick={onClose}>{t('common.cancel','Cancel')}</button>
            </div>
          </div>
        </div>
      </Draggable>
    </div>
  );
}
