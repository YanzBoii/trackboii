import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where
} from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { addDays, dateKey } from '../lib/dates.js';

export const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

const HISTORY_DAYS = 31;

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

export function DataProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = chargement, null = déconnecté
  const [profile, setProfile] = useState(undefined);
  const [meals, setMeals] = useState([]);
  const [presets, setPresets] = useState([]);
  const [weights, setWeights] = useState([]);
  const [verified, setVerified] = useState(false);
  const today = useToday();

  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u);
    setVerified(!!u?.emailVerified);
    if (!u) { setProfile(undefined); setMeals([]); setPresets([]); setWeights([]); }
  }), []);

  useEffect(() => {
    if (!user || !verified) return;
    const base = `users/${user.uid}`;
    const snapList = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const unsubs = [
      onSnapshot(doc(db, base), s => setProfile(s.exists() ? s.data() : null)),
      onSnapshot(query(collection(db, base, 'meals'), where('date', '>=', addDays(today, -(HISTORY_DAYS - 1)))),
        s => setMeals(snapList(s).sort(byCreated))),
      onSnapshot(collection(db, base, 'presets'), s => setPresets(snapList(s).sort(byCreated))),
      onSnapshot(collection(db, base, 'weights'), s => setWeights(snapList(s).sort((a, b) => a.date.localeCompare(b.date))))
    ];
    return () => unsubs.forEach(u => u());
  }, [user, verified, today]);

  const value = useMemo(() => {
    const base = user ? `users/${user.uid}` : null;
    const col = name => collection(db, base, name);
    return {
      user, verified, profile, meals, presets, weights, today,
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
      addMeal: meal => addDoc(col('meals'), { date: today, ...meal, createdAt: serverTimestamp() }),
      updateMeal: (id, data) => updateDoc(doc(db, base, 'meals', id), data),
      deleteMeal: id => deleteDoc(doc(db, base, 'meals', id)),
      addPreset: preset => addDoc(col('presets'), { ...preset, createdAt: serverTimestamp() }),
      deletePreset: id => deleteDoc(doc(db, base, 'presets', id)),
      addWeight: kg => setDoc(doc(db, base, 'weights', today), { date: today, kg }),
      logout: () => signOut(auth)
    };
  }, [user, verified, profile, meals, presets, weights, today]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
