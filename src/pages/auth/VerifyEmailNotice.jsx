// src/pages/auth/VerifyEmailNotice.jsx
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/firebase';
import { requestVerifyEmail } from '../../services/verifyApi';
import { useEffect, useState } from 'react';

export default function VerifyEmailNotice() {
  const nav = useNavigate();
  const [sentMsg, setSentMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [fallbackLink, setFallbackLink] = useState('');

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resend = async () => {
    const u = auth.currentUser;
    if (!u) return nav('/login');

    setSentMsg('');
    setFallbackLink('');

    try {
      const res = await requestVerifyEmail(); // your fetch wrapper
      setSentMsg('Verification email sent. Please use the most recent email only.');
      setCooldown(60);
      if (res?.link) setFallbackLink(res.link); // optional "Open link" fallback
    } catch (e) {
      const txt = String(e?.message || '');
      if (txt.includes('429') || txt.includes('RATE_LIMIT') || txt.includes('TOO_MANY_ATTEMPTS')) {
        setSentMsg('You requested too many times. Please wait a bit before trying again.');
        setCooldown(60);
      } else {
        setSentMsg('Failed to resend. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto glass rounded-2xl p-6 mt-10 text-center">
      <h1 className="text-2xl font-semibold">Verify your email</h1>
      <p className="mt-2 text-sm text-slate-500">
        We’ve sent a verification link to your email. After verifying, please log in again.
      </p>

      <div className="mt-4 flex gap-2 justify-center">
        <button className="px-4 py-2 rounded-lg border" onClick={() => nav('/login')}>
          Go to login
        </button>
        <button
          disabled={cooldown > 0}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white disabled:opacity-50"
          onClick={resend}
        >
          {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend'}
        </button>
      </div>

      {sentMsg && <div className="mt-3 text-xs text-emerald-600">{sentMsg}</div>}
      {fallbackLink && (
        <div className="mt-2 text-xs">
          Didn’t receive the email?{' '}
          <a className="underline" href={fallbackLink} target="_blank" rel="noreferrer">
            Click here to verify now
          </a>
        </div>
      )}
    </div>
  );
}
