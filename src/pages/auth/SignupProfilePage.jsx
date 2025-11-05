// src/pages/auth/SignupProfilePage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { requestVerifyEmail } from '../../services/verifyApi';
import { sendVerifyEmail } from '../../lib/emailjsClient';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET;

export default function SignupProfilePage() {
  const nav = useNavigate();
  const [uid, setUid] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    icNumber: '',
    matricNo: '',
    phone: '',
    practicum: '',
  });
  const [matricFile, setMatricFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) nav('/signup', { replace: true });
      else setUid(u.uid);
    });
    return () => unsub();
  }, [nav]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function uploadMatricCard(file) {
    if (!file) throw new Error('Please upload your matric card image.');
    if (!CLOUD_NAME || !PRESET) throw new Error('Cloudinary not configured.');
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', PRESET);
    // optional: fd.append('folder', 'matricCards'); // preset already sets it
    const res = await fetch(url, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    const json = await res.json();
    return json.secure_url; // store this in Firestore
  }

  const save = async (e) => {
    e.preventDefault();
    if (!uid) return;
    setErr('');
    setLoading(true);

    try {
      // 1) Upload matric card to Cloudinary (unsigned)
      const matricUrl = await uploadMatricCard(matricFile);

      // 2) Save profile to Firestore with image URL
      await setDoc(
        doc(db, 'Users', uid),
        {
          role: 'user',
          email: auth.currentUser?.email || '',
          ...form,
          matricUrl,                 // 👈 saved here
          createdAt: serverTimestamp(),
          verification: { status: 'pending', reviewedBy: null, reviewedAt: null },
        },
        { merge: true }
      );

      // 3) Get Firebase verify link from your backend
      const { link, to, name } = await requestVerifyEmail();

      // 4) Send the email via EmailJS (client-side)
      await sendVerifyEmail({
        to_email: to || auth.currentUser?.email,
        to_name: name || form.fullName || 'there',
        app_name: 'ItemCloud',
        verification_url: link,
      });

      // 5) Sign out and show the verify screen
      await signOut(auth);
      nav('/verify-email', { replace: true });
    } catch (e) {
      console.error('[SignupProfile] error:', e);
      setErr(e?.message || 'Failed to complete signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto glass rounded-2xl p-6 mt-10">
      <h1 className="text-2xl font-semibold">Complete your profile</h1>
      <form onSubmit={save} className="mt-4 grid gap-3">
        <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder="Full name" value={form.fullName} onChange={setField('fullName')} required />
        <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder="IC number" value={form.icNumber} onChange={setField('icNumber')} required />
        <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder="Matric No" value={form.matricNo} onChange={setField('matricNo')} required />
        <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder="Phone" value={form.phone} onChange={setField('phone')} required />
        <input className="px-3 py-2 rounded-lg border dark:bg-slate-800" placeholder="Practicum" value={form.practicum} onChange={setField('practicum')} required />

        {/* NEW: matric card image */}
        <label className="text-sm text-slate-600">Upload matric card (image)</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setMatricFile(e.target.files?.[0] || null)}
          required
          className="px-3 py-2 rounded-lg border dark:bg-slate-800"
        />

        {err && <div className="text-sm text-red-500">{err}</div>}
        <button disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-3 py-2">
          {loading ? 'Submitting…' : 'Finish & Verify Email'}
        </button>
      </form>
    </div>
  );
}
