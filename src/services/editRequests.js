// src/services/editRequests.js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { notifyAdmins } from './notify';

export async function requestProfileEdit(newData) {
  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in');

  // Create an approval ticket admins can see in AdminUpdates
  const ref = await addDoc(collection(db, 'EditRequests'), {
    uid: u.uid,
    email: u.email || '',
    newData,                 // the exact fields the user wants to change
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  // Ping admins so they know to review
  await notifyAdmins({
    title: 'Profile edit request',
    message: `${u.email || u.uid} requested to update their profile.`,
    link: '/updates',
  });

  return ref.id;
}
