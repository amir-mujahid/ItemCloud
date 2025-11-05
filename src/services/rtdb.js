// src/services/rtdb.js
import { rtdb } from './firebase';
import { ref, runTransaction, onValue, off } from 'firebase/database';

export const unlockRef = (box) => ref(rtdb, `UnlockCodes/${box}`);

const CHARS = '0123456789ABCD';
function makeCode(n = 8) {
  let s = '';
  for (let i = 0; i < n; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

const FIVE_MIN = 5 * 60 * 1000;

export async function createOrReuseUnlock({ box, itemID, uid }) {
  const now = Date.now();
  const expiresAt = now + FIVE_MIN;

  return runTransaction(unlockRef(box), (cur) => {
    // If no code or not pending/expired -> create new
    if (
      !cur ||
      !cur.startedAtMs ||
      !cur.expiredAtMs ||
      !cur.status ||
      cur.status !== 'pending' ||
      now >= cur.expiredAtMs
    ) {
      return {
        code: makeCode(8),
        itemID,
        uid,
        startedAtMs: now,
        expiredAtMs: expiresAt,
        status: 'pending',
      };
    }
    // Otherwise keep existing
    return cur;
  }).then((res) => {
    const committed = res.committed;
    const val = res.snapshot.val();

    const isBlocked =
      !committed && val && val.status === 'pending' && Date.now() < val.expiredAtMs;

    if (isBlocked && val.uid !== uid) {
      const msLeft = Math.max(0, val.expiredAtMs - Date.now());
      const seconds = Math.ceil(msLeft / 1000);
      const err = new Error(`Item is being claimed. Try again in ~${seconds}s`);
      err.code = 'IN_USE';
      err.msLeft = msLeft;
      throw err;
    }

    // If not committed but it’s ours and still valid, reuse it
    if (!committed && val.uid === uid && Date.now() < val.expiredAtMs) return val;

    return val;
  });
}

export async function cancelUnlock({ box, uid }) {
  await runTransaction(unlockRef(box), (cur) => {
    if (!cur) return cur;
    if (cur.status === 'pending' && cur.uid === uid) {
      return { ...cur, status: 'cancelled', expiredAtMs: Date.now() };
    }
    return cur;
  });
}

export function listenUnlock(box, cb) {
  const r = unlockRef(box);
  const handler = (snap) => cb(snap.exists() ? snap.val() : null);
  onValue(r, handler);
  return () => off(r, 'value', handler);
}

export async function markExpiredIfNeeded({ box }) {
  await runTransaction(unlockRef(box), (cur) => {
    if (!cur) return cur;
    if (cur.status === 'pending' && Date.now() >= cur.expiredAtMs) {
      return { ...cur, status: 'expired' };
    }
    return cur;
  });
}
