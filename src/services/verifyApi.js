// src/services/verifyApi.js
import { auth } from '../services/firebase';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Request email verification link.
 * @param {Object} opts
 * @param {'main' | 'alt'} opts.app - Optional. Which app URL to use.
 */
export async function requestVerifyEmail({ app } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();

  const url = `${API_BASE}/api/send-verify`;
  console.log('[verifyApi] POST', url, { app });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ app }), // 👈 tell backend which redirect target
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Send verification failed: ${res.status} ${text.slice(0,200)}`);

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json'))
    throw new Error('API returned non-JSON (check API_BASE_URL / rewrites)');

  return JSON.parse(text);
}
