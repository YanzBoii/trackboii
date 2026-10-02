import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeMeal } from '../lib/api.js';
import { idbDel, idbGet, idbSet } from '../lib/idb.js';

const POLL_MS = 30_000;
const backoff = attempts => Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));

/**
 * Repas à analyser plus tard (pas de réseau, IA saturée).
 * Stockés sur l'appareil (IndexedDB) par utilisateur, analysés automatiquement au retour du réseau.
 */
export function usePendingQueue({ uid, addMeal, notify }) {
  const [pending, setPending] = useState([]);
  const items = useRef([]);
  const busy = useRef(false);
  const key = uid ? `pending:${uid}` : null;

  const save = useCallback(async next => {
    items.current = next;
    setPending(next);
    if (key) await idbSet(key, next).catch(() => {});
  }, [key]);

  const patch = (id, data) => save(items.current.map(it => (it.id === id ? { ...it, ...data } : it)));
  const remove = useCallback(id => save(items.current.filter(it => it.id !== id)), [save]);

  const process = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    busy.current = true;
    try {
      for (const it of items.current) {
        if (it.status !== 'waiting' || (it.nextTry || 0) > Date.now()) continue;
        try {
          const r = await analyzeMeal({ image: it.photo?.ai, name: it.name, weight: it.weight, ingredients: it.ingredients });
          if (!r.isFood) {
            await patch(it.id, { status: 'error', error: 'Pas de nourriture détectée sur la photo.' });
            continue;
          }
          addMeal({
            date: it.date, moment: it.moment, name: r.name, kcal: r.kcal, p: r.p, c: r.c, f: r.f,
            weight: r.weight, ingredients: r.ingredients, thumb: it.photo?.thumb || null, source: 'IA'
          }).catch(() => {});
          await remove(it.id);
          notify(`${r.name} analysé : ${r.kcal} kcal`);
        } catch (e) {
          const attempts = (it.attempts || 0) + 1;
          if (e.retryable) {
            await patch(it.id, { attempts, nextTry: Date.now() + backoff(attempts) });
            break; // réseau ou IA indisponible : inutile d'enchaîner les autres tout de suite
          }
          await patch(it.id, { status: 'error', attempts, error: e.message });
        }
      }
    } finally {
      busy.current = false;
    }
  }, [addMeal, notify, remove]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement depuis l'appareil
  useEffect(() => {
    items.current = [];
    setPending([]);
    if (!key) return;
    let alive = true;
    idbGet(key).then(v => { if (alive && Array.isArray(v)) { items.current = v; setPending(v); } }).catch(() => {});
    return () => { alive = false; };
  }, [key]);

  // Relance : retour du réseau, retour sur l'app, et toutes les 30 s s'il reste des repas
  useEffect(() => {
    if (!key) return;
    const kick = () => { if (document.visibilityState === 'visible') process(); };
    window.addEventListener('online', kick);
    document.addEventListener('visibilitychange', kick);
    const id = setInterval(() => { if (items.current.some(it => it.status === 'waiting')) kick(); }, POLL_MS);
    kick();
    return () => { window.removeEventListener('online', kick); document.removeEventListener('visibilitychange', kick); clearInterval(id); };
  }, [key, process, pending.length]);

  return {
    pending,
    queueMeal: async meal => {
      await save([...items.current, { ...meal, id: crypto.randomUUID(), status: 'waiting', attempts: 0, nextTry: 0, queuedAt: Date.now() }]);
    },
    retryPending: async id => {
      await patch(id, { status: 'waiting', nextTry: 0, error: null });
      process();
    },
    removePending: remove,
    clearPending: async () => { items.current = []; setPending([]); if (key) await idbDel(key).catch(() => {}); }
  };
}
