/* eslint-env node */
// Mirror ONLY 'successful' to Firestore/Claim
// Also auto-expire RTDB codes after 5 minutes

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onValueWritten } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");
admin.initializeApp();

const REGION = "asia-southeast1";
const TZ = "UTC";
const FIVE_MIN_MS = 5 * 60 * 1000;

const rtdb = admin.database();
const fs = admin.firestore();

// Write to Firestore/Claim with doc id = claimId (if provided) else = code
async function writeClaimSuccessful(boxKey, payload) {
  const claimId = payload.claimId || payload.code;
  if (!claimId) return;

  const doc = {
    box: boxKey,
    code: payload.code || "",
    itemID: payload.itemID || null,
    uid: payload.uid || null,
    status: "successful",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (payload.startedAtMs) doc.createdAt = new Date(Number(payload.startedAtMs));
  if (payload.expiredAtMs || payload.expiresAtMs) {
    doc.expiresAtMs = Number(payload.expiredAtMs || payload.expiresAtMs);
  }

  await fs.collection("Claim").doc(claimId).set(doc, { merge: true });
}

// RTDB → when status flips to 'successful', write one row to Firestore/Claim
exports.onUnlockStatus = onValueWritten(
  { ref: "/UnlockCodes/{box}", region: REGION },
  async (event) => {
    const before = event.data.before.val() || {};
    const after  = event.data.after.val()  || {};
    if (!after) return;

    const boxKey = event.params.box;
    if (after.status === "successful" && before.status !== "successful") {
      await writeClaimSuccessful(boxKey, after);
      // harden RTDB: prevent reuse
      await event.data.ref.update({ expiredAtMs: Date.now() });
    }
  }
);

// Every minute: mark still-pending >5min as expired (RTDB only)
exports.expireCodes = onSchedule(
  { schedule: "every 1 minutes", timeZone: TZ, region: REGION },
  async () => {
    const snap = await rtdb.ref("/UnlockCodes").get();
    if (!snap.exists()) return;

    const now = Date.now();
    const updates = {};

    snap.forEach(child => {
      const boxKey = child.key;
      const v = child.val() || {};
      const status = v.status || "pending";
      if (status !== "pending") return;

      const exp = Number(v.expiredAtMs || v.expiresAtMs || 0) ||
                  (v.startedAtMs ? Number(v.startedAtMs) + FIVE_MIN_MS : 0);

      if (exp && now > exp) {
        const base = `/UnlockCodes/${boxKey}`;
        updates[`${base}/status`] = "expired";
        updates[`${base}/statusAtMs`] = now;
        updates[`${base}/expiredBy`] = "cron";
      }
    });

    if (Object.keys(updates).length) await rtdb.ref().update(updates);
  }
);
