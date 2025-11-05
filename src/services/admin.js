// src/services/admin.js
// Admin-only helpers used by AdminUpdatesPage:
//  • recapture() triggers esp32-cam snap and returns the image URL
//  • adminUnlock() forces a temporary unlock window via RTDB

import { db, rtdb } from './firebase';
import { updateDoc, doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref as rRef, set as rSet } from 'firebase/database';

const CAM1 = import.meta.env.VITE_CAM1_URL || 'http://esp32-cam-1.local';
const CAM2 = import.meta.env.VITE_CAM2_URL || 'http://esp32-cam-2.local';

export async function updateUser(uid, patch) {
  await updateDoc(doc(db, 'Users', uid), patch);
}

export async function updateItem(id, patch) {
  await updateDoc(doc(db, 'LostItems', id), patch);
}

function fetchWithTimeout(url, opts = {}, ms = 4000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...opts, signal: ctl.signal }).finally(() => clearTimeout(t));
}

export async function recapture(box) {
  const base = box === 'box1' ? CAM1 : CAM2;

  try {
    // POST /snap (your camera’s handler)
    const res = await fetchWithTimeout(`${base}/snap`, { method: 'POST' }, 5000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Some firmwares return JSON, some return nothing — be defensive
    try {
      const j = await res.json();
      return j.secure_url || j.url || null;
    } catch {
      return null; // treat as fire-and-forget
    }
  } catch (e) {
    // Surface a friendly message to the UI
    throw new Error(`Camera ${box} is offline or unreachable`);
  }
}

export async function adminUnlock(box, seconds = 15) {
  const s = Math.max(1, Math.min(30, seconds));
  await rSet(rRef(rtdb, `unlockOverride/${box}`), {
    atMs: Date.now(),
    seconds: s,
  });
  await addDoc(collection(db, 'AdminActions'), {
    type: 'unlock',
    box,
    seconds: s,
    at: serverTimestamp(),
  });
}
