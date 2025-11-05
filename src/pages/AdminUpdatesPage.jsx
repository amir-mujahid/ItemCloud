import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import {
  collection, getDocs, updateDoc, deleteDoc, doc,
  orderBy, query, limit, serverTimestamp, setDoc
} from 'firebase/firestore';
import { recapture, adminUnlock, updateUser, updateItem } from '../services/admin';
import { TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { pushNotif } from '../services/notify';
import { useI18n } from '../i18n';

export default function AdminUpdatesPage() {
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  async function loadAll() {
    const uSnap = await getDocs(collection(db, 'Users'));
    setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const iSnap = await getDocs(
      query(collection(db, 'LostItems'), orderBy('createdAt', 'desc'), limit(50))
    );
    setItems(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const rSnap = await getDocs(
      query(collection(db, 'EditRequests'), orderBy('createdAt', 'desc'), limit(50))
    );
    setRequests(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => { loadAll(); }, []);

  async function handleRecapture(box, itemId) {
    setBusy(true);
    setMsg('Capturing new photo…');
    try {
      const url = await recapture(box);
      if (url && itemId) {
        await updateItem(itemId, { imageUrl: url, updatedAt: new Date() });
      }
      setMsg('Done.');
    } catch (e) {
      setMsg(e.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(box) {
    setBusy(true);
    setMsg('Sending override…');
    try {
      await adminUnlock(box, 15);
      setMsg('Box unlocked (15s override)');
    } catch (e) {
      setMsg(e.message || 'Override failed');
    } finally {
      setBusy(false);
    }
  }

  async function setRole(id, role) {
    await updateUser(id, { role });
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, role } : u)));
  }

  async function removeUser(id) {
    if (!confirm('Delete this user profile document? (Auth account not removed here)')) return;
    await deleteDoc(doc(db, 'Users', id));
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  async function removeItem(id) {
    if (!confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'LostItems', id));
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function approveRequest(r) {
    try {
      const allowedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
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
        title: t('updates.profileEditApproved'),
        message: t('updates.profileEditApprovedMsg'),
        link: '/settings',
        meta: { requestId: r.id, until: allowedUntil.toISOString() },
      });
      setRequests(prev => prev.map(x => (x.id === r.id ? { ...x, status: 'approved' } : x)));
    } catch (e) {
      alert(e?.message || 'Failed to approve');
    }
  }

  async function denyRequest(r) {
    try {
      await setDoc(
        doc(db, 'Users', r.uid, 'settings', 'profileEdit'),
        { allowed: false, allowedUntil: null, approvedBy: null },
        { merge: true }
      );
      await pushNotif(r.uid, {
        type: 'approval',
        title: t('updates.profileEditDenied'),
        message: t('updates.profileEditDeniedMsg'),
        link: '/settings',
        meta: { requestId: r.id },
      });
      await deleteDoc(doc(db, 'EditRequests', r.id));
      setRequests(prev => prev.filter(x => x.id !== r.id));
    } catch (e) {
      alert(e?.message || 'Failed to deny');
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-8">
      <h1 className="text-2xl font-semibold">{t('updates.title')}</h1>
      {msg && <div className="text-sm text-slate-600">{msg}</div>}

      {/* Profile edit requests */}
      <section className="glass rounded-2xl p-5 border border-slate-400 dark:border-slate-500">
        <h2 className="text-xl font-semibold mb-3">{t('updates.profileEditRequests')}</h2>
        <div className="-mx-4 md:mx-0 overflow-x-auto">
          <table className="min-w-full text-sm border border-slate-300 dark:border-slate-600 rounded-xl">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="[&>th]:p-2 [&>th]:text-left">
                <th>UID</th>
                <th>{t('updates.email')}</th>
                <th>{t('updates.status')}</th>
                <th>{t('updates.requestedAt')}</th>
                <th className="text-center">{t('updates.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
              {requests.map(r => (
                <tr key={r.id} className="[&>td]:p-2">
                  <td className="font-mono text-xs">{r.uid}</td>
                  <td>{r.email || '—'}</td>
                  <td className="capitalize">{r.status || t('updates.pending')}</td>
                  <td>{r.createdAt?.toDate?.().toLocaleString?.() || '—'}</td>
                  <td>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => approveRequest(r)}
                        disabled={r.status === 'approved'}
                        className="px-2 py-1 text-xs rounded bg-emerald-600 text-white inline-flex items-center gap-1"
                      >
                        <CheckIcon className="h-4 w-4" /> {t('updates.approve')}
                      </button>
                      <button
                        onClick={() => denyRequest(r)}
                        className="px-2 py-1 text-xs rounded bg-rose-600 text-white inline-flex items-center gap-1"
                      >
                        <XMarkIcon className="h-4 w-4" /> {t('updates.denyDelete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td className="p-3 text-slate-500" colSpan={5}>{t('updates.noRequests')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users */}
      <section className="glass rounded-2xl p-5 border border-slate-400 dark:border-slate-500">
        <h2 className="text-xl font-semibold mb-3">{t('updates.users')}</h2>
        <div className="-mx-4 md:mx-0 overflow-x-auto">
          <table className="min-w-full text-sm border border-slate-300 dark:border-slate-600 rounded-xl">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="[&>th]:p-2 [&>th]:text-left">
                <th>{t('updates.email')}</th>
                <th>{t('updates.role')}</th>
                <th className="text-center">{t('updates.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
              {users.map(u => (
                <tr key={u.id} className="[&>td]:p-2">
                  <td className="truncate max-w-[28ch]">{u.email || u.displayName || u.id}</td>
                  <td className="capitalize">{u.role || 'user'}</td>
                  <td>
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setRole(u.id, 'admin')} className="px-2 py-1 text-xs rounded bg-blue-600 text-white">{t('updates.makeAdmin')}</button>
                      <button onClick={() => setRole(u.id, 'user')} className="px-2 py-1 text-xs rounded bg-slate-700 text-white">{t('updates.makeUser')}</button>
                      <button onClick={() => removeUser(u.id)} className="px-2 py-1 text-xs rounded bg-rose-600 text-white inline-flex items-center gap-1">
                        <TrashIcon className="h-4 w-4" /> {t('updates.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="p-3 text-slate-500" colSpan={3}>{t('updates.noUsers')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lost Items */}
      <section className="glass rounded-2xl p-5 border border-slate-400 dark:border-slate-500">
        <h2 className="text-xl font-semibold mb-3">{t('updates.lostItems')}</h2>
        <div className="-mx-4 md:mx-0 overflow-x-auto">
          <table className="min-w-full text-sm border border-slate-300 dark:border-slate-600 rounded-xl">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="[&>th]:p-2">
                <th className="text-left">{t('updates.photo')}</th>
                <th className="text-left">{t('updates.item')}</th>
                <th className="text-left">{t('updates.box')}</th>
                <th className="text-left">{t('updates.status')}</th>
                <th className="text-center">{t('updates.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
              {items.map(it => (
                <tr key={it.id} className="[&>td]:p-2">
                  <td>
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt={it.itemID || it.id}
                        className="h-28 w-40 object-cover rounded-md border border-slate-300 dark:border-slate-600"
                      />
                    ) : '—'}
                  </td>
                  <td className="font-mono">{it.itemID || it.id}</td>
                  <td>{it.boxId || it.box || '—'}</td>
                  <td className="capitalize">{it.status || 'lost'}</td>
                  <td>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button onClick={() => updateItem(it.id, { status: 'locked' })} className="px-2 py-1 text-xs rounded border">{t('updates.locked')}</button>
                      <button onClick={() => updateItem(it.id, { status: 'claimed' })} className="px-2 py-1 text-xs rounded border">{t('updates.claimed')}</button>
                      <button onClick={() => updateItem(it.id, { status: 'open' })} className="px-2 py-1 text-xs rounded border">{t('updates.open')}</button>
                      <button onClick={() => handleRecapture('box1', it.id)} className="px-2 py-1 text-xs rounded border">{t('updates.recaptureB1')}</button>
                      <button onClick={() => handleRecapture('box2', it.id)} className="px-2 py-1 text-xs rounded border">{t('updates.recaptureB2')}</button>
                      <button onClick={() => removeItem(it.id)} className="px-2 py-1 text-xs rounded bg-rose-600 text-white inline-flex items-center gap-1">
                        <TrashIcon className="h-4 w-4" /> {t('updates.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td className="p-3 text-slate-500" colSpan={5}>{t('updates.noItems')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Box override */}
      <section className="glass rounded-2xl p-5 border border-slate-400 dark:border-slate-500">
        <h2 className="text-xl font-semibold mb-3">{t('updates.boxControls')}</h2>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => handleUnlock('box1')} className="px-3 py-2 bg-emerald-600 text-white rounded">{t('updates.unlockBox1')}</button>
          <button disabled={busy} onClick={() => handleUnlock('box2')} className="px-3 py-2 bg-emerald-600 text-white rounded">{t('updates.unlockBox2')}</button>
        </div>
      </section>
    </div>
  );
}
