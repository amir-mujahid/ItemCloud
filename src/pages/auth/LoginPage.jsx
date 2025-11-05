// src/pages/auth/LoginPage.jsx
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);

    const eTrim = email.trim();

    try {
      const { user } = await signInWithEmailAndPassword(auth, eTrim, pw);
      await user.reload();
      if (!user.emailVerified) {
        return nav('/verify-email', { replace: true });
      }
      nav('/dashboard', { replace: true });
    } catch (error) {
      // Friendly error mapping
      const code = error?.code || '';
      let message = 'Login failed.';

      if (code === 'auth/invalid-credential') {
        // New Firebase behavior (combines wrong email / wrong password).
        // We’ll check if the email exists to tailor the message.
        try {
          const methods = await fetchSignInMethodsForEmail(auth, eTrim);
          if (!methods || methods.length === 0) {
            message = 'Email not found. Check the spelling or create an account.';
          } else {
            message = 'Password is incorrect.';
          }
        } catch {
          // If the lookup itself fails, fall back to generic invalid credentials text.
          message = 'Email or password is incorrect.';
        }
      } else if (code === 'auth/user-disabled') {
        message = 'This account has been disabled.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please wait a moment and try again.';
      } else if (code === 'auth/invalid-email') {
        message = 'Email address is not valid.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error. Check your connection and try again.';
      } else if (typeof error?.message === 'string') {
        // Last resort—trim the Firebase prefix if present
        message = error.message.replace(/^Firebase:\s*/i, '');
      }

      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto glass rounded-2xl p-6 mt-10">
      <h1 className="text-2xl font-semibold">Log in</h1>

      <form onSubmit={login} className="mt-4 space-y-3">
        <input
          className="w-full px-3 py-2 rounded-lg border dark:bg-slate-800"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          className="w-full px-3 py-2 rounded-lg border dark:bg-slate-800"
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
          autoComplete="current-password"
        />

        {err && <div className="text-sm text-red-500">{err}</div>}

        <button
          disabled={loading}
          className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-3 py-2"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="text-sm mt-3">
        New here?{' '}
        <button className="underline" onClick={() => nav('/signup')}>
          Create account
        </button>
      </div>
    </div>
  );
}
