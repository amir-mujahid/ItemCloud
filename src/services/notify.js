// src/services/notify.js
import { auth, db } from './firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';

/* Notifications structure: Notifications/{uid}/items/{notifId} */

// Push a notification into a user's inbox (client writes to appropriate path)
export async function pushNotif(
  uid,
  { type = 'system', title, message, link, meta } = {}
) {
  if (!uid) throw new Error('No uid for notification');
  const col = collection(db, 'Notifications', uid, 'items');
  return addDoc(col, {
    type,
    title,
    message,
    link: link || null,
    meta: meta || null,
    createdAt: serverTimestamp(),
    read: false,
  });
}

// Live unread count (unsubscribe returned)
export function subscribeUnreadCount(uid, cb) {
  const col = collection(db, 'Notifications', uid, 'items');
  const q = query(col, where('read', '==', false));
  return onSnapshot(q, (snap) => cb(snap.size));
}

// Live notifications list (newest first)
export function subscribeNotifications(uid, cb) {
  const col = collection(db, 'Notifications', uid, 'items');
  const q = query(col, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export function markNotifRead(uid, id) {
  return updateDoc(doc(db, 'Notifications', uid, 'items', id), { read: true });
}

export async function markAllRead(uid) {
  const col = collection(db, 'Notifications', uid, 'items');
  const q = query(col, where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

// Optional: server fan-out to admins
export async function notifyAdmins({ title, message, link = '' }) {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('VITE_API_BASE_URL not set');

  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in');

  const token = await u.getIdToken();
  const res = await fetch(`${base}/api/notify-admins`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, message, link }),
  });

  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || `notify-admins failed (HTTP ${res.status})`);
  return data;
}
