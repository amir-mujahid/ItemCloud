// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
// If you later enable App Check, you can import/initialize it here.

const firebaseConfig = {
  apiKey: 'AIzaSyApm49AWMB2uQx1n_h0TBrQ1XEAx3va9_s',
  authDomain: 'itemcloud-9a47f.firebaseapp.com',
  projectId: 'itemcloud-9a47f',
  storageBucket: 'itemcloud-9a47f.appspot.com',
  messagingSenderId: '557606501225',
  appId: '1:557606501225:web:440ae3a1ad9772eb305bf8',
  databaseURL:
    'https://itemcloud-9a47f-default-rtdb.asia-southeast1.firebasedatabase.app',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export default app;
