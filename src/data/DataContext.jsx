import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { deleteUser, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  addDoc, clearIndexedDbPersistence, collection, deleteDoc, doc, getDocs, onSnapshot, query,
  serverTimestamp, setDoc, terminate, updateDoc, where, writeBatch
} from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { addDays, dateKey } from '../lib/dates.js';
import { useUi } from './UiContext.jsx';
import { usePendingQueue } from './usePendingQueue.js';

export const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

const HISTORY_DAYS = 31;
const SUBCOLLECTIONS = ['meals', 'presets', 'weights'];

function useToday() {
  const [today, setToday] = useState(dateKey());
  useEffect(() => {
    const tick = () => setToday(dateKey());
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);
  return today;
}

const byCreated = (a, b) => (a.createdAt?.seconds ?? Infinity) - (b.createdAt?.seconds ?? Infinity);

/** Efface le cache local Firestore (données de l'utilisateur sur l'appareil) puis recharge l'app. */
async function wipeLocalAndReload() {
  try { sessionStorage.clear(); } catch { /* indisponible */ }
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch { /* un autre onglet garde le cache ouvert : il sera nettoyé au prochain démarrage */ }
  location.replace('/');
}

export function DataProvider({ children }) {
  const { showToast } = useUi();
  const [user, setUser] = useState(undefined); // undefined = chargement, null = déconnecté
  const [profile, setProfile] = useState(undefined);
  const [meals, setMeals] = useState([]);
  const [presets, setPresets] = useState([]);
  const [weights, setWeights] = useState([]);
  const [verified, setVerified] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const today = useToday();
  const base = user ? `users/${user.uid}` : null;

  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u);
    setVerified(!!u?.emailVerified);
    setLoadError(null);
    if (!u) { setProfile(undefined); setMeals([]); setPresets([]); setWeights([]); }
  }), []);

  useEffect(() => {
    if (!user || !verified) return;
    const snapList = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const onError = async err => {
      console.error(err);
      // Jeton émis avant la vérification de l'email : on le rafraîchit puis on relance les listeners
      if (err.code === 'permission-denied' && attempt === 0) {
        try { await auth.currentUser.getIdToken(true); setAttempt(1); return; } catch { /* hors ligne */ }
      }
      setLoadError(err.code === 'permission-denied' ? 'Accès refusé à tes données.' : 'Impossible de charger tes données.');
    };
    const unsubs = [
      onSnapshot(doc(db, base), s => setProfile(s.exists() ? s.data() : null), onError),
      onSnapshot(query(collection(db, base, 'meals'), where('date', '>=', addDays(today, -(HISTORY_DAYS - 1)))),
        s => setMeals(snapList(s).sort(byCreated)), onError),
      onSnapshot(collection(db, base, 'presets'), s => setPresets(snapList(s).sort(byCreated)), onError),
      onSnapshot(collection(db, base, 'weights'), s => setWeights(snapList(s).sort((a, b) => a.date.localeCompare(b.date))), onError)
    ];
    return () => unsubs.forEach(u => u());
  }, [user, verified, today, base, attempt]);

  const addMeal = useCallback(
    meal => addDoc(collection(db, base, 'meals'), { date: dateKey(), ...meal, createdAt: serverTimestamp() }),
    [base]
  );
  const queue = usePendingQueue({ uid: verified ? user?.uid : null, addMeal, notify: showToast });

  const value = useMemo(() => ({
    user, verified, profile, meals, presets, weights, today, loadError,
    ...queue,
    retryLoad: () => { setLoadError(null); setAttempt(a => a + 1); },
    /** Recharge l'utilisateur après clic sur le lien de vérification (et rafraîchit le token pour Firestore). */
    checkVerified: async () => {
      await auth.currentUser.reload();
      if (!auth.currentUser.emailVerified) return false;
      await auth.currentUser.getIdToken(true);
      setVerified(true);
      return true;
    },
    todayMeals: meals.filter(m => m.date === today),
    saveProfile: data => setDoc(doc(db, base), data, { merge: true }),
    addMeal,
    updateMeal: (id, data) => updateDoc(doc(db, base, 'meals', id), data),
    deleteMeal: id => deleteDoc(doc(db, base, 'meals', id)),
    addPreset: preset => addDoc(collection(db, base, 'presets'), { ...preset, createdAt: serverTimestamp() }),
    deletePreset: id => deleteDoc(doc(db, base, 'presets', id)),
    addWeight: kg => setDoc(doc(db, base, 'weights', today), { date: today, kg }),
    logout: async () => {
      await queue.clearPending();
      await signOut(auth);
      await wipeLocalAndReload();
    },
    /** Supprime toutes les données puis le compte. L'appelant doit avoir réauthentifié l'utilisateur juste avant. */
    deleteAccount: async () => {
      for (const name of SUBCOLLECTIONS) {
        const snap = await getDocs(collection(db, base, name));
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
      await deleteDoc(doc(db, base));
      await queue.clearPending();
      await deleteUser(auth.currentUser);
      await wipeLocalAndReload();
    }
  }), [user, verified, profile, meals, presets, weights, today, loadError, queue, base, addMeal]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
