// src/services/api.js
// Client-side API helpers for Lost Items + box unlock flow.
// • Generates exactly one code per click (RTDB transaction).
// • Only touches the chosen box path: /UnlockCodes/<boxId>
// • Pairs with AllClaims helpers in ./claims.js for sequential C0001 IDs.

import { auth, db, rtdb } from './firebase';
import {
  collection, getDocs, orderBy, where, query, limit,
} from 'firebase/firestore';
import { markExpiredIfNeeded } from './rtdb'; // you already have this helper in rtdb.js
import {
  ref as rRef,
  runTransaction as rRunTx,
  onValue, off, get as rGet, update as rUpdate,
  set as rSet,
} from 'firebase/database';
import {
  nextClaimId,
  createAllClaimPending,
  updateAllClaimStatus,
} from './claims';

import {
  triggerQRUnlock,
  listenUnlockConfirmation,
  cancelQRUnlock
} from './rtdb';


// ---------------- Lost items ----------------
export async function fetchLostItems() {
  const q = query(
    collection(db, 'LostItems'),
    where('status', '==', 'lost'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    // normalize in case some docs use "box" instead of "boxId"
    boxId: d.data().boxId || d.data().box || '',
  }));
}

// Subscribe to RTDB live state for a specific box only
export function subscribeUnlockCode(boxId, cb) {
  const node = rRef(rtdb, `UnlockCodes/${boxId}`);
  const unsub = onValue(node, (s) => {
    const v = s.val() || {};
    // Normalize device values; treat 'used' as 'successful'
    const status =
      (v.status === 'successful' || v.status === 'used')
        ? 'successful'
        : (v.status || '');
    cb({ ...v, status, boxId });
  });
  return () => off(node);
}

// Utility: secure-ish 8-char uppercase code
function makeCode(n = 8) {
  const ABC = '0123456789ABCD'; // only digits and A-D to avoid confusion
  let out = '';
  for (let i = 0; i < n; i++) out += ABC[Math.floor(Math.random() * ABC.length)];
  return out;
}

// Internal: write RTDB node in a transaction (prevents double-writes)
async function writeCodeNodeTx({ boxId, attemptId, itemID, code, expiresAtMs }) {
  const node = rRef(rtdb, `UnlockCodes/${boxId}`);
  const byUid = auth.currentUser?.uid || 'anon';

  const result = await rRunTx(node, (cur) => {
    cur = cur || {};
    if (cur.status === 'pending' && cur.attemptId && cur.attemptId !== attemptId) {
      return; // abort tx
    }
    // ✅ Build fresh payload WITH NEW STRUCTURE
    return {
      // identity
      boxId,
      itemID,
      attemptId,
      byUid,

      // new code window
      code,
      status: 'pending',
      startedAtMs: Date.now(),
      expiresAtMs,

      // explicitly clear stale fields
      expiredAtMs: null,
      cancelledAtMs: null,
      liveInput: '',
      liveInputAtMs: null,

      // ✅ NEW: Initialize unlock request structure
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
  }, { applyLocally: false });

  if (!result?.committed) {
    const err = new Error('Box already has a pending attempt.');
    err.code = 'IN_USE';
    throw err;
  }

  await rUpdate(rRef(rtdb, `unlock/${boxId}/window`), {
    status: 'pending',
    code,
    atMs: Date.now(),
    expiresAtMs,
    attemptId,
  });

  return { boxId, itemID, code, expiresAtMs, attemptId };
}

// Public: request NEW code for this item/box; creates AllClaims with Cxxxx
export async function requestUnlockCode(itemID, boxId) {
  // 1) allocate sequential claim id
  const attemptId = await nextClaimId();

  // 2) create AllClaims/<Cxxxx> (pending, no code yet)
  await createAllClaimPending({
    claimId: attemptId,
    uid: auth.currentUser?.uid || 'anon',
    box: boxId,
    itemID,
  });

  // 3) write RTDB atomically (avoid duplicates)
  const code = makeCode(8);
  const expiresAtMs = Date.now() + 5 * 60 * 1000;
  const payload = await writeCodeNodeTx({ boxId, attemptId, itemID, code, expiresAtMs });

  // ✅ 4) NOW mirror code + expiry into AllClaims (the initial create didn't have them)
  await updateAllClaimStatus(attemptId, 'pending', { code, expiresAtMs });

  return payload;
}

// Public: cancel current code (keeps the attempt; page will mark AllClaims)
export async function cancelUnlockCode(boxId) {
  await rUpdate(rRef(rtdb, `UnlockCodes/${boxId}`), {
    status: 'cancelled',
    cancelledAtMs: Date.now(),
  });
  await rUpdate(rRef(rtdb, `unlock/${boxId}/window`), {
    status: 'cancelled',
    atMs: Date.now(),
  });
}

// Public: resend code for same attempt (flip back to pending)
export async function resendUnlockCode(itemID, boxId, attemptId) {
  const code = makeCode(8);
  const expiresAtMs = Date.now() + 5 * 60 * 1000;

  if (attemptId) {
    await updateAllClaimStatus(attemptId, 'pending'); // flip status back
  }
  return await writeCodeNodeTx({ boxId, attemptId, itemID, code, expiresAtMs });
}

// Public: mark expired in BOTH RTDB and AllClaims
export async function expireUnlockCode(boxId, attemptId) {
  // RTDB
  await rUpdate(rRef(rtdb, `UnlockCodes/${boxId}`), {
    status: 'expired',
    expiredAtMs: Date.now(),
  });
  await rUpdate(rRef(rtdb, `unlock/${boxId}/window`), {
    status: 'expired',
    atMs: Date.now(),
  });
  // Firestore (audit trail)
  if (attemptId) {
    await updateAllClaimStatus(attemptId, 'expired', { reason: 'timeout' });
  }
}

// Convenience: single read (for debugging/tools)
export async function readBoxUnlockNode(boxId) {
  const s = await rGet(rRef(rtdb, `UnlockCodes/${boxId}`));
  return { boxId, ...(s.val() || {}) };
}

// NEW: reconcile one box (free, client-only)
export async function reconcileBox(boxId) {
  try { await markExpiredIfNeeded({ box: boxId }); } catch {}
  const node = await readBoxUnlockNode(boxId);       // { attemptId, status, ... }
  const id = node.attemptId;
  if (!id) return;
  if (node.status === 'successful' || node.status === 'used') {
    await updateAllClaimStatus(id, 'successful').catch(() => {});
  } else if (node.status === 'expired') {
    await updateAllClaimStatus(id, 'expired', {
      reason: 'timeout', expiredAtMs: node.expiredAtMs || Date.now(),
    }).catch(() => {});
  } else if (node.status === 'cancelled') {
    await updateAllClaimStatus(id, 'cancelled', {
      reason: 'user_cancelled', cancelledAtMs: node.cancelledAtMs || Date.now(),
    }).catch(() => {});
  }
}

/**
 * Trigger unlock via QR code scan
 * Returns a promise that resolves when ESP32 confirms unlock
 */
export async function unlockViaQRCode(boxId, attemptId) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  
  // Trigger unlock request in RTDB
  await triggerQRUnlock({ box: boxId, attemptId, uid });
  
  // Wait for ESP32 confirmation with timeout
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      cancelQRUnlock({ box: boxId }).catch(() => {});
      reject(new Error('Unlock timeout - ESP32 did not respond'));
    }, 10000); // 10 second timeout
    
    const unsubscribe = listenUnlockConfirmation(boxId, (result) => {
      clearTimeout(timeout);
      unsubscribe();
      
      if (result.success) {
        resolve(result);
      } else {
        reject(new Error('Unlock failed'));
      }
    });
  });
}

/**
 * Validate and trigger QR unlock
 * Sets unlock request in RTDB, ESP32 will detect and unlock
 * No need to wait for ESP32 confirmation
 */
export async function validateAndUnlockQR(scannedBoxId) {
  const currentUserId = auth.currentUser?.uid;
  
  console.log('🔍 validateAndUnlockQR called with boxId:', scannedBoxId);
  console.log('🔍 Current user ID:', currentUserId);
  
  if (!currentUserId) {
    const err = new Error('You must be logged in to unlock');
    err.code = 'NOT_AUTHENTICATED';
    throw err;
  }
  
  if (!scannedBoxId) {
    const err = new Error('Invalid QR code - no box ID found');
    err.code = 'INVALID_QR';
    throw err;
  }
  
  // 1. Get unlock session from RTDB
  const snap = await rGet(rRef(rtdb, `UnlockCodes/${scannedBoxId}`));
  const session = snap.val();
  
  console.log('🔍 Session data:', session);
  
  // 2. Validation checks
  if (!session) {
    const err = new Error('No active unlock session found for this box');
    err.code = 'NO_SESSION';
    throw err;
  }
  
  // Check if session belongs to current user
  if (session.byUid !== currentUserId) {
    const err = new Error('This unlock session belongs to another user. Please claim your own item first.');
    err.code = 'WRONG_USER';
    throw err;
  }
  
  // Check status
  if (session.status !== 'pending') {
    const err = new Error(`Cannot unlock: session is ${session.status}`);
    err.code = 'INVALID_STATUS';
    throw err;
  }
  
  // Check expiration
  if (Date.now() >= session.expiresAtMs) {
    const err = new Error('This unlock session has expired. Please request a new code.');
    err.code = 'EXPIRED';
    throw err;
  }
  
  console.log('✅ All validations passed');
  
  // 3. Update RTDB - Set unlock request and status
  // ESP32 will monitor this and unlock when it sees triggered = true
  const now = Date.now();
  await rUpdate(rRef(rtdb, `UnlockCodes/${scannedBoxId}`), {
    status: 'successful',
    unlockRequest: {
      method: 'qr_scan',
      requestedAt: now,
      triggered: true,
      processedAt: 0  // ESP32 will update this after unlocking
    },
    lastUnlockMethod: 'qr_scan',
    lastUnlockAt: now,
    unlockAttempts: (session.unlockAttempts || 0) + 1
  });
  
  console.log('✅ RTDB updated - ESP32 will detect and unlock');
  
  // 4. Return success immediately - no need to wait for ESP32
  return {
    success: true,
    boxId: scannedBoxId,
    attemptId: session.attemptId,
    method: 'qr_scan',
    requestedAt: now
  };
}

/**
 * Verify an unlock code by scanning UnlockCodes/* nodes and returning the matching node.
 * Returns { ok: true, attemptId, itemId, boxId, status } or { ok: false }.
 *
 * NOTE: This reads the entire UnlockCodes node once client-side. For production use a
 * secure server endpoint or Cloud Function that validates the code and returns the attemptId.
 */
export async function verifyUnlockCode(code) {
  if (!code) return { ok: false };

  // Read all UnlockCodes children once
  const snap = await rGet(rRef(rtdb, 'UnlockCodes'));
  const all = snap.val() || {};

  // Find first match by exact code (case-sensitive) and status pending/successful
  for (const [boxId, node] of Object.entries(all)) {
    if (!node) continue;
    if (node.code === code) {
      return {
        ok: true,
        attemptId: node.attemptId || null,
        itemId: node.itemID || null,
        boxId,
        status: node.status || null,
      };
    }
  }
  return { ok: false };
}
