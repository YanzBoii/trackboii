import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { useUi } from '../data/UiContext.jsx';
import { analyzeMeal } from '../lib/api.js';
import { dateKey } from '../lib/dates.js';

const STEPS = ['Identification des aliments', 'Estimation des portions', 'Calcul des calories et des macros'];

/** Met le brouillon en file d'attente (analyse automatique au retour du réseau). */
export async function queueDraft(draft, queueMeal) {
  await queueMeal({
    date: dateKey(), moment: draft.moment, name: draft.name.trim(), weight: draft.weight,
    ingredients: draft.ingredients.trim(), photo: draft.mode === 'texte' ? null : draft.photo
  });
}

export default function Analyzing() {
  const navigate = useNavigate();
  const { queueMeal } = useData();
  const { draft, patchDraft, resetDraft, showToast } = useUi();
  const [step, setStep] = useState(0);
  const started = useRef(false);
  const alive = useRef(true);
  const cancelled = useRef(false);
  const hasInput = draft.photo || draft.name.trim() || draft.ingredients.trim();

  useEffect(() => {
    alive.current = true;
    const timers = [1, 2].map(i => setTimeout(() => setStep(i), i * 900));
    return () => { alive.current = false; timers.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (started.current || !hasInput) return;
    started.current = true;
    analyzeMeal({ image: draft.photo?.ai, name: draft.name.trim(), weight: draft.weight, ingredients: draft.ingredients.trim() })
      .then(result => {
        if (!alive.current || cancelled.current) return;
        if (!result.isFood) {
          showToast('Je ne vois pas de nourriture sur cette photo');
          return navigate('/ajouter', { replace: true });
        }
        setStep(3);
        patchDraft({ result });
        setTimeout(() => alive.current && navigate('/resultat', { replace: true }), 350);
      })
      .catch(async e => {
        if (cancelled.current) return;
        if (e.retryable) {
          // Réseau absent ou IA saturée : le repas est gardé et sera analysé automatiquement
          await queueDraft(draft, queueMeal);
          showToast('Analyse en attente : ton repas sera ajouté dès que possible');
          if (alive.current) { resetDraft(); navigate('/', { replace: true }); }
          return;
        }
        if (!alive.current) return;
        showToast(e.message || 'L\'analyse a échoué');
        navigate('/ajouter', { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasInput) return <Navigate to="/ajouter" replace />;

  return (
    <div className="col gap16" style={{ minHeight: 'calc(100dvh - 120px)', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 180, height: 180, display: 'grid', placeItems: 'center' }}>
        <div className='glow' style={{ inset: -40, background: 'radial-gradient(closest-side, var(--blob1), transparent)', opacity: 0.9 }} />
        <div className="spinner" style={{ position: 'relative' }} />
      </div>
      <div className="col gap6">
        <div style={{ fontSize: 26, fontWeight: 600 }}>Analyse en cours</div>
        <div style={{ fontSize: 15, color: 'var(--mute)' }}>TrackBoii regarde ce qu'il y a dans ton assiette.</div>
      </div>
      <div className="glass col gap10" style={{ padding: '18px 22px', borderRadius: 24, minWidth: 280, textAlign: 'left' }}>
        {STEPS.map((l, i) => (
          <div key={l} className="row gap10" style={{ fontSize: 14, color: step > i ? 'var(--ink)' : 'var(--mute2)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: step > i ? 'var(--accent)' : 'var(--soft)', transition: 'background .3s' }} />{l}
          </div>
        ))}
      </div>
      <button className="link" style={{ color: 'var(--mute)' }} onClick={() => { cancelled.current = true; navigate('/ajouter', { replace: true }); }}>Annuler</button>
    </div>
  );
}
