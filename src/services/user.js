// src/services/user.js
import { auth, db } from '../services/firebase';
import {
  collection, doc, getDoc, addDoc, serverTimestamp, getDocs, query, where, orderBy, updateDoc
} from 'firebase/firestore';

// Get Users/<uid> doc
export async function getUserDoc(uid = auth.currentUser?.uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'Users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Update Users/<uid> doc (profile fields you already use)
export async function updateUserProfile(partial, uid = auth.currentUser?.uid) {
  if (!uid) throw new Error('No user');
  await updateDoc(doc(db, 'Users', uid), partial);
}

// Get claim events for a dashboard (successful user claims)
export async function getUserClaims(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const q = query(
    collection(db, 'Claim'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Profile-edit gate: Users/{uid}/settings/profileEdit
 * Shape: { allowed: boolean, allowedUntil: Timestamp|number|Date }
 */
export async function isProfileEditAllowed(uid) {
  const gateRef = doc(db, 'Users', uid, 'settings', 'profileEdit');
  const snap = await getDoc(gateRef);
  if (!snap.exists()) return { ok: false };
  const d = snap.data();
  const until =
    d.allowedUntil?.toDate?.() ||
    (typeof d.allowedUntil === 'number' ? new Date(d.allowedUntil) : d.allowedUntil);
  const ok = !!d.allowed && (!until || until > new Date());
  return { ok, data: d };
}

// Create EditRequests doc for admin review
export async function requestProfileEdit(uid, email) {
  await addDoc(collection(db, 'EditRequests'), {
    uid,
    email: email || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}
