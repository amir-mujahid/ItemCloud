// src/services/api.js
// Client-side API helpers for Lost Items + box unlock flow.
// • Generates exactly one code per click (RTDB transaction).
// • Only touches the chosen box path: /UnlockCodes/<boxId>
// • Pairs with AllClaims helpers in ./claims.js for sequential C0001 IDs.

import { auth, db, rtdb } from './firebase';
import {
  collection, getDocs, orderBy, where, query, limit,
} from 'firebase/firestore';
import { markExpiredIfNeeded } from './rtdb';
import {
  ref as rRef,
  runTransaction as rRunTx,
  onValue, off, get as rGet, update as rUpdate,
} from 'firebase/database';
import {
  nextClaimId,
  createAllClaimPending,
  updateAllClaimStatus,
} from './claims';

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
    boxId: d.data().boxId || d.data().box || '',
  }));
}

// Subscribe to RTDB live state for a specific box only
export function subscribeUnlockCode(boxId, cb) {
  const node = rRef(rtdb, `UnlockCodes/${boxId}`);
  const unsub = onValue(node, (s) => {
    const v = s.val() || {};
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
  const ABC = '0123456789ABCD';
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
      return;
    }
    return {
      boxId,
      itemID,
      attemptId,
      byUid,
      code,
      status: 'pending',
      startedAtMs: Date.now(),
      expiresAtMs,
      expiredAtMs: null,
      cancelledAtMs: null,
      liveInput: '',
      liveInputAtMs: null,
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
  const attemptId = await nextClaimId();

  await createAllClaimPending({
    claimId: attemptId,
    uid: auth.currentUser?.uid || 'anon',
    box: boxId,
    itemID,
  });

  const code = makeCode(8);
  const expiresAtMs = Date.now() + 5 * 60 * 1000;
  const payload = await writeCodeNodeTx({ boxId, attemptId, itemID, code, expiresAtMs });

  await updateAllClaimStatus(attemptId, 'pending', { code, expiresAtMs });

  return payload;
}

// Public: cancel current code
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

// Public: resend code
export async function resendUnlockCode(itemID, boxId, attemptId) {
  const code = makeCode(8);
  const expiresAtMs = Date.now() + 5 * 60 * 1000;

  if (attemptId) {
    await updateAllClaimStatus(attemptId, 'pending');
  }
  return await writeCodeNodeTx({ boxId, attemptId, itemID, code, expiresAtMs });
}

// Public: mark expired
export async function expireUnlockCode(boxId, attemptId) {
  await rUpdate(rRef(rtdb, `UnlockCodes/${boxId}`), {
    status: 'expired',
    expiredAtMs: Date.now(),
  });
  await rUpdate(rRef(rtdb, `unlock/${boxId}/window`), {
    status: 'expired',
    atMs: Date.now(),
  });
  if (attemptId) {
    await updateAllClaimStatus(attemptId, 'expired', { reason: 'timeout' });
  }
}

// Convenience: single read
export async function readBoxUnlockNode(boxId) {
  const s = await rGet(rRef(rtdb, `UnlockCodes/${boxId}`));
  return { boxId, ...(s.val() || {}) };
}

// NEW: reconcile one box
export async function reconcileBox(boxId) {
  try { await markExpiredIfNeeded({ box: boxId }); } catch {}
  const node = await readBoxUnlockNode(boxId);
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
  
  if (session.byUid !== currentUserId) {
    const err = new Error('This unlock session belongs to another user. Please claim your own item first.');
    err.code = 'WRONG_USER';
    throw err;
  }
  
  if (session.status !== 'pending') {
    const err = new Error(`Cannot unlock: session is ${session.status}`);
    err.code = 'INVALID_STATUS';
    throw err;
  }
  
  if (Date.now() >= session.expiresAtMs) {
    const err = new Error('This unlock session has expired. Please request a new code.');
    err.code = 'EXPIRED';
    throw err;
  }
  
  console.log('✅ All validations passed');
  
  // 3. Update RTDB - Set unlock request and status
  const now = Date.now();
  
  try {
    await rUpdate(rRef(rtdb, `UnlockCodes/${scannedBoxId}`), {
      status: 'successful',
      'unlockRequest/method': 'qr_scan',
      'unlockRequest/requestedAt': now,
      'unlockRequest/triggered': true,
      'unlockRequest/processedAt': 0,
      lastUnlockMethod: 'qr_scan',
      lastUnlockAt: now,
      unlockAttempts: (session.unlockAttempts || 0) + 1
    });
    
    console.log('✅ RTDB updated - ESP32 will detect and unlock');
  } catch (updateError) {
    console.error('❌ RTDB update failed:', updateError);
    throw updateError;
  }
  
  // 4. Return success immediately
  return {
    success: true,
    boxId: scannedBoxId,
    attemptId: session.attemptId,
    method: 'qr_scan',
    requestedAt: now
  };
}

/**
 * Verify an unlock code
 */
export async function verifyUnlockCode(code) {
  if (!code) return { ok: false };

  const snap = await rGet(rRef(rtdb, 'UnlockCodes'));
  const all = snap.val() || {};

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