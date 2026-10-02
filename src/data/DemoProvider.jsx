// Mode démo (npm run demo) : données en mémoire, sans Firebase ni IA. Jamais actif en production.
import { useMemo, useState } from 'react';
import { DataContext } from './DataContext.jsx';
import { addDays, dateKey } from '../lib/dates.js';

const today = dateKey();
const seedMeals = () => {
  const out = [];
  for (let i = 1; i < 12; i++) {
    const k = 1900 + Math.round(Math.sin(i * 1.7) * 300);
    out.push({ id: 'h' + i, date: addDays(today, -i), moment: 'dej', name: 'Repas', kcal: k, p: Math.round(k * 0.05), c: Math.round(k * 0.11), f: Math.round(k * 0.035), source: 'IA' });
  }
  out.push({ id: 'm1', date: today, moment: 'pdj', name: 'Œufs & jambon', kcal: 380, p: 30, c: 4, f: 24, source: 'Preset' });
  out.push({ id: 'm2', date: today, moment: 'dej', name: 'Bowl poulet, riz, avocat', kcal: 640, p: 42, c: 68, f: 22, source: 'IA' });
  return out;
};

export default function DemoProvider({ children }) {
  const [profile, setProfile] = useState({ name: 'Léo', sex: 'h', age: 24, height: 178, weight: 78, goal: 'perte', activity: 'modere', pace: 'reco', onboarded: true, targets: { kcal: 2210, p: 156, c: 238, f: 69 } });
  const [meals, setMeals] = useState(seedMeals);
  const [presets, setPresets] = useState([{ id: 'p1', name: 'Œufs & jambon', items: '2 œufs · 2 tranches de jambon', kcal: 380, p: 30, c: 4, f: 24, ingredients: [] }]);
  const [weights, setWeights] = useState([78.4, 78.1, 77.9, 77.4, 77.0, 76.9].map((kg, i) => ({ id: String(i), date: addDays(today, (i - 5) * 7), kg })));
  const ok = () => Promise.resolve();

  const value = useMemo(() => ({
    user: { uid: 'demo', email: 'demo@trackboii.app', providerData: [{ providerId: 'password' }], getIdToken: async () => '' },
    // ?verify dans l'URL affiche l'écran de vérification d'email
    verified: !location.search.includes('verify'), checkVerified: async () => false,
    profile, meals, presets, weights, today, loadError: null, retryLoad() {},
    pending: [], queueMeal: async () => {}, retryPending() {}, removePending() {}, clearPending: async () => {}, deleteAccount: async () => {},
    todayMeals: meals.filter(m => m.date === today),
    saveProfile: d => { setProfile(p => ({ ...p, ...d })); return ok(); },
    addMeal: m => { setMeals(s => [...s, { id: String(Date.now()), date: today, ...m }]); return ok(); },
    updateMeal: (id, d) => { setMeals(s => s.map(m => (m.id === id ? { ...m, ...d } : m))); return ok(); },
    deleteMeal: id => { setMeals(s => s.filter(m => m.id !== id)); return ok(); },
    addPreset: p => { setPresets(s => [...s, { id: String(Date.now()), ...p }]); return ok(); },
    deletePreset: id => { setPresets(s => s.filter(p => p.id !== id)); return ok(); },
    addWeight: kg => { setWeights(s => [...s.filter(w => w.date !== today), { id: today, date: today, kg }]); return ok(); },
    logout: () => setProfile(p => ({ ...p, onboarded: false }))
  }), [profile, meals, presets, weights]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
