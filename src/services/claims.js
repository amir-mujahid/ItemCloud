// src/services/claims.js
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

/* =========== Counter (same as yours) =========== */
export async function nextClaimId() {
  const ctrRef = doc(db, 'counters', 'claim');
  const idNum = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ctrRef);
    const cur = snap.exists() ? Number(snap.data().n || 0) : 0;
    const n = cur + 1;
    tx.set(ctrRef, { n }, { merge: true });   // rules: +1 only
    return n;
  });
  return `C${String(idNum).padStart(4, '0')}`;
}

/* =========== Create attempt in AllClaims (pending) =========== */
export async function createClaimAttempt({ uid, itemID, box, code, expiresAtMs }) {
  if (!uid)   throw new Error("createClaimAttempt: uid is required");
  if (!itemID) throw new Error("createClaimAttempt: itemID is required");
  if (!box)   throw new Error("createClaimAttempt: box is required");

  const claimId = await nextClaimId();
  await setDoc(doc(db, 'AllClaims', claimId), {
    uid,
    itemID,
    box,
    status: 'pending',
    code: code ?? null,
    expiresAtMs: expiresAtMs ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return claimId;
}

/* =========== Update attempt status in AllClaims =========== */
export async function setClaimAttemptStatus(claimId, status, extra = {}) {
  if (!claimId) return;
  await updateDoc(doc(db, 'AllClaims', claimId), {
    status,
    updatedAt: serverTimestamp(),
    ...extra,                   // (you already fixed this)
  });
}

/* =========== Atomic “mini cloud function” on success =========== */
/**
 * Ensures mirror + LostItems update happen together.
 * - If the AllClaims doc is not yet "successful", set it so.
 * - Mirror to Claim/<claimId>
 * - Set LostItems/<itemId>.status = "claimed"
 */
export async function finalizeSuccessfulClaim(attemptId) {
  const attemptRef = doc(db, 'AllClaims', attemptId);
  const attempt = await getDoc(attemptRef);
  if (!attempt.exists()) throw new Error('Attempt not found');
  const A = attempt.data();

  // ✅ ensure AllClaims is successful (guards early calls)
  if (A.status !== 'successful') {
    await updateDoc(attemptRef, { status: 'successful', updatedAt: serverTimestamp() });
  }

  // 1) Create Claim/<new> with attemptId (required by rules)
  const claimId = await nextClaimId();
  const claimRef = doc(db, 'Claim', claimId);
  await setDoc(claimRef, {
    attemptId,
    uid: A.uid ?? null,
    itemID: A.itemID,
    box: A.box,
    status: 'successful',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2) (optional) mirror back to attempt — ONLY if you added 'claimRef' to rules
  try {
    await updateDoc(attemptRef, { claimRef: claimId, updatedAt: serverTimestamp() });
  } catch (e) {
    // ignore if rules don’t allow claimRef (PERMISSION_DENIED)
    // console.warn('claimRef mirror skipped:', e);
  }

  // 3) Mark LostItems/<itemID> as claimed (rules check Claim exists + itemID match)
  const lostRef = doc(db, 'LostItems', A.itemID);
  await updateDoc(lostRef, {
    status: 'claimed',
    claimId,
    claimedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { claimId, itemID: A.itemID };
}

/* ======= Back-compat helpers (kept, but prefer finalizeSuccessfulClaim) ======= */
export async function createAllClaimPending({
  claimId, uid, box, itemID, code = "", expiresAtMs = null,
}) {
  if (!uid)   throw new Error("createAllClaimPending: uid is required");
  if (!itemID) throw new Error("createAllClaimPending: itemID is required");
  if (!box)   throw new Error("createAllClaimPending: box is required");

  const id = claimId || (await nextClaimId());
  await setDoc(doc(db, "AllClaims", id), {
    uid,
    itemID,
    box,
    status: "pending",
    code,
    expiresAtMs,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return id;
}

export async function updateAllClaimStatus(claimId, status, extra = {}) {
  return setClaimAttemptStatus(claimId, status, extra);
}

// Legacy one-shot – recommend replacing calls with finalizeSuccessfulClaim()
export async function recordSuccessfulClaim({ claimId }) {
  return finalizeSuccessfulClaim(claimId);
}
