import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';

export default function SignupEmailPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const next = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pw);
      // go to profile step
      nav('/signup/profile', { replace: true });
    } catch (e) {
      setErr(e.message || 'Failed to sign up.');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto glass rounded-2xl p-6 mt-10">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <form onSubmit={next} className="mt-4 space-y-3">
        <input className="w-full px-3 py-2 rounded-lg border dark:bg-slate-800"
               placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full px-3 py-2 rounded-lg border dark:bg-slate-800"
               placeholder="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} required />
        {err && <div className="text-sm text-red-500">{err}</div>}
        <button disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-3 py-2">
          {loading ? 'Creating...' : 'Continue'}
        </button>
      </form>
      <div className="text-sm mt-3">
        Already have an account? <button className="underline" onClick={()=>nav('/login')}>Log in</button>
      </div>
    </div>
  );
}
