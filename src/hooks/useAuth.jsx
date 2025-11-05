// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, rtdb } from '../services/firebase';          // <- add rtdb
import { ref as rRef, update as rUpdate } from 'firebase/database';

const AuthCtx = createContext({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopProfile = () => {};
    const stopAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setProfile(null);
      stopProfile();

      if (!u) { setLoading(false); return; }
      setLoading(true);

      const userRef = doc(db, 'Users', u.uid);

      // Ensure a minimal profile exists
      let firstRole = 'user';
      try {
        const firstSnap = await getDoc(userRef);
        if (!firstSnap.exists()) {
          await setDoc(userRef, {
            email: u.email ?? '',
            role: 'user',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } else {
          firstRole = firstSnap.data()?.role || 'user';
        }
        // Mirror to RTDB (so RTDB rules can check /users/{uid}/role)
        await rUpdate(rRef(rtdb, `users/${u.uid}`), {
          role: firstRole,
          email: u.email ?? null,
          syncedAt: Date.now(),
        });
      } catch (_) {
        // non-fatal
      }

      // Live subscribe to role changes and keep RTDB mirror updated
      stopProfile = onSnapshot(
        userRef,
        async (snap) => {
          const data = snap.exists() ? snap.data() : null;
          setProfile(data);
          setLoading(false);

          if (data?.role) {
            rUpdate(rRef(rtdb, `users/${u.uid}`), {
              role: data.role,
              email: u.email ?? null,
              syncedAt: Date.now(),
            }).catch(() => {});
          }
        },
        () => setLoading(false)
      );
    });

    return () => {
      stopAuth();
      stopProfile();
    };
  }, []);

  const isAdmin = !!profile && profile.role === 'admin';

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin,
  }), [user, profile, loading, isAdmin]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
