// src/services/rtdb.js
import { rtdb } from './firebase';
import { ref, runTransaction, onValue, off, update, get } from 'firebase/database';

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
        // NEW: Initialize unlock request structure
        unlockRequest: {
          method: '',
          requestedAt: 0,
          triggered: false,
          processedAt: 0
        },
        unlockAttempts: 0,
        lastUnlockMethod: '',
        lastUnlockAt: 0
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

    // If not committed but it's ours and still valid, reuse it
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

/* ============ NEW: QR UNLOCK FUNCTIONS ============ */

/**
 * Trigger QR unlock for a box
 * This sets the unlock request that ESP32 will listen to
 */
export async function triggerQRUnlock({ box, attemptId, uid }) {
  const now = Date.now();
  
  return runTransaction(unlockRef(box), (cur) => {
    if (!cur) {
      throw new Error('No active unlock session');
    }
    
    // Validate session
    if (cur.status !== 'pending') {
      throw new Error(`Cannot unlock: status is ${cur.status}`);
    }
    
    if (now >= cur.expiredAtMs) {
      throw new Error('Unlock session has expired');
    }
    
    if (cur.uid !== uid) {
      throw new Error('This unlock session belongs to another user');
    }
    
    if (cur.attemptId && cur.attemptId !== attemptId) {
      throw new Error('Attempt ID mismatch');
    }
    
    // Set unlock request
    return {
      ...cur,
      unlockRequest: {
        method: 'qr_scan',
        requestedAt: now,
        triggered: true,
        processedAt: 0
      }
    };
  });
}

/**
 * Cancel QR unlock request (e.g., user changed mind or timeout)
 */
export async function cancelQRUnlock({ box }) {
  const boxRef = unlockRef(box);
  await update(boxRef, {
    'unlockRequest/triggered': false,
    'unlockRequest/method': '',
    'unlockRequest/requestedAt': 0
  });
}

/**
 * Listen to unlock confirmation from ESP32
 * Callback receives { success: true, method: 'qr_scan', processedAt: timestamp }
 */
export function listenUnlockConfirmation(box, callback) {
  const boxRef = ref(rtdb, `UnlockCodes/${box}/unlockRequest`);
  const handler = (snap) => {
    if (snap.exists()) {
      const data = snap.val();
      // If processedAt is set, ESP32 has confirmed unlock
      if (data.processedAt > 0 && data.triggered === false) {
        callback({
          success: true,
          method: data.method,
          processedAt: data.processedAt
        });
      }
    }
  };
  onValue(boxRef, handler);
  return () => off(boxRef, 'value', handler);
}

/**
 * Get current unlock session for a box
 */
export async function getUnlockSession(box) {
  const snap = await get(unlockRef(box));
  return snap.exists() ? snap.val() : null;
}

/**
 * Update box status (for monitoring)
 */
export async function updateBoxStatus(box, updates) {
  const statusRef = ref(rtdb, `BoxStatus/${box}`);
  await update(statusRef, {
    ...updates,
    lastHeartbeat: Date.now()
  });
}