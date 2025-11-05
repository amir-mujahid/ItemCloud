// src/services/hep.js
import { auth, db } from './firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  increment,
} from 'firebase/firestore';
import { pushNotif } from './notify';

/** Calls your Vercel backend which sends mail via Gmail API.
 *  NOTE: Backend uses fixed HEP_TO_EMAIL; we do NOT send a "to" from client.
 *  Requires VITE_API_BASE_URL (e.g. https://your-app.vercel.app)
 */
async function sendHepEmail({ subject, html, text, report }) {
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (!base) throw new Error('VITE_API_BASE_URL not set');

  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in');

  const token = await u.getIdToken();
  const res = await fetch(`${base}/api/forward-hep`, {               // ⬅️ new route
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subject, html, text, report }),           // backend ignores "to" and uses HEP_TO_EMAIL
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `forward-hep failed (HTTP ${res.status})`);
  return data;
}

/* ───────── Admin helpers ───────── */

export async function setHepInProgress(id, adminUid) {
  await updateDoc(doc(db, 'Reports', id), {
    status: 'in_progress',
    updatedAt: serverTimestamp(),
    lastUpdatedBy: adminUid || null,
  });
}

export async function saveHepDraft(id, draft, adminUid) {
  await updateDoc(doc(db, 'Reports', id), {
    adminDraft: draft || '',
    updatedAt: serverTimestamp(),
    lastUpdatedBy: adminUid || null,
  });
}

/** Forward to HEP (keeps the report; marks as forwarded)
 *  - Email includes item info + reporter details
 *  - Notifies reporter that HEP is processing
 *  - Report stays until Resolve is clicked
 */
export async function forwardHep(
  id,
  { subject, formalMessage },
  adminUid
) {
  const ref = doc(db, 'Reports', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Report not found');
  const report = { id: snap.id, ...snap.data() };

  // Pull reporter profile (name, matric, phone, email)
  let user = null;
  try {
    const uSnap = await getDoc(doc(db, 'Users', report.uid));
    user = uSnap.exists() ? { id: uSnap.id, ...uSnap.data() } : null;
  } catch {}

  // Pull item info (itemID, box) if available
  let item = null;
  if (report.itemId) {
    try {
      const iSnap = await getDoc(doc(db, 'LostItems', report.itemId));
      item = iSnap.exists() ? { id: iSnap.id, ...iSnap.data() } : null;
    } catch {}
  }

  const itemID = item?.itemID || report.itemId || '—';
  const box    = item?.box || item?.boxId || '—';

  const reporterName   = user?.fullName || '—';
  const reporterMatric = user?.matricNo || '—';
  const reporterPhone  = report.contact || user?.phone || '—';
  const reporterEmail  = user?.email || '—';

  const sub = subject || `HEP report • ${itemID} • Box ${box} • ${reporterName}`;
  const msg = (formalMessage || report.description || '').toString();

  const detailsHtml = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#0f172a">
      <h3 style="margin:0 0 8px">Item Details</h3>
      <table style="border-collapse:collapse">
        <tr><td style="padding:2px 8px 2px 0;color:#64748b">Item ID</td><td><b>${itemID}</b></td></tr>
        <tr><td style="padding:2px 8px 2px 0;color:#64748b">Box</td><td>${box}</td></tr>
      </table>

      <h3 style="margin:16px 0 8px">Reporter</h3>
      <table style="border-collapse:collapse">
        <tr><td style="padding:2px 8px 2px 0;color:#64748b">Name</td><td>${reporterName}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;color:#64748b">Student ID</td><td>${reporterMatric}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;color:#64748b">Contact</td><td>${reporterPhone}</td></tr>
        <tr><td style="padding:2px 8px 2px 0;color:#64748b">Email</td><td>${reporterEmail}</td></tr>
      </table>

      <h3 style="margin:16px 0 8px">Message</h3>
      <p style="white-space:pre-wrap;margin:0 0 12px">${msg.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>

      <p style="color:#64748b;margin-top:16px">ItemCloud report ID: <b>${report.id}</b></p>
    </div>
  `;

  const detailsText =
`Item Details
- Item ID: ${itemID}
- Box: ${box}

Reporter
- Name: ${reporterName}
- Student ID: ${reporterMatric}
- Contact: ${reporterPhone}
- Email: ${reporterEmail}

Message
${msg}

ItemCloud report ID: ${report.id}`;

  // Send via backend (no "to"; server uses HEP_TO_EMAIL)
  await sendHepEmail({ subject: sub, html: detailsHtml, text: detailsText, report });

  // Mark as forwarded (keep in DB)
  await updateDoc(ref, {
    status: 'forwarded',
    forwardedAt: serverTimestamp(),
    forwardedBy: adminUid || null,
    forwardCount: increment(1),
    updatedAt: serverTimestamp(),
    lastUpdatedBy: adminUid || null,
  });

  // Notify reporter
  await pushNotif(report.uid, {
    type: 'hep',
    title: 'Report Forwarded to HEP',
    message:
      'Your report has been forwarded to HEP for processing. For inquiries, please contact info.itemcloud@gmail.com.',
    link: '',
    meta: { reportId: report.id, status: 'forwarded' },
  });
}

export async function resolveHep(id, { formalMessage }, adminUid) {
  const ref = doc(db, 'Reports', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Report not found');
  const report = { id: snap.id, ...snap.data() };

  await pushNotif(report.uid, {
    type: 'hep',
    title: 'HEP Report Resolved',
    message: formalMessage || 'Your report has been resolved. Thank you.',
    link: '',
    meta: { reportId: report.id, status: 'resolved' },
  });

  // delete only on resolve
  await deleteDoc(ref);
}

/* ───────── User create ───────── */

export async function createHepReport(
  { title, description, itemId = null, category = 'general', contact = '' },
  uid
) {
  const payload = {
    uid,
    title: title || 'Report',
    description: description || '',
    itemId,
    category,
    contact,               // keep a contact field the admin can see
    status: 'new',
    adminDraft: '',
    forwardCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'Reports'), payload);
  return ref.id;
}
