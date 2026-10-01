import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

/** Mode démo sans Firebase (`npm run demo`) : VITE_DEMO n'est défini que par .env.demo. */
export const DEMO = import.meta.env.VITE_DEMO === '1';
export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

const app = firebaseConfigured && !DEMO ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
if (auth) auth.languageCode = 'fr';
export const db = app
  ? initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  : null;
