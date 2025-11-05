// src/services/presence.js
import { rtdb, auth } from '../services/firebase';
import { ref, onDisconnect, serverTimestamp, set } from 'firebase/database';

export function initPresence() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const statusRef = ref(rtdb, `status/${uid}`);
  set(statusRef, { state: 'online', last_changed: Date.now() });
  onDisconnect(statusRef).set({ state: 'offline', last_changed: serverTimestamp() });
}
