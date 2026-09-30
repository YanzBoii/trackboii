import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUi } from '../data/UiContext.jsx';
import { analyzeMeal } from '../lib/api.js';

const STEPS = ['Identification des aliments', 'Estimation des portions', 'Calcul des calories et des macros'];

export default function Analyzing() {
  const navigate = useNavigate();
  const { draft, patchDraft, showToast } = useUi();
  const [step, setStep] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const timers = [1, 2].map(i => setTimeout(() => setStep(i), i * 900));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    analyzeMeal({ image: draft.photo?.ai, name: draft.name.trim(), weight: draft.weight, ingredients: draft.ingredients.trim() })
      .then(result => {
        if (!result.isFood) {
          showToast('Je ne vois pas de nourriture sur cette photo');
          return navigate('/ajouter', { replace: true });
        }
        setStep(3);
        patchDraft({ result });
        setTimeout(() => navigate('/resultat', { replace: true }), 350);
      })
      .catch(e => {
        showToast(e.message || 'L\'analyse a échoué');
        navigate('/ajouter', { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="col gap16" style={{ minHeight: 'calc(100dvh - 120px)', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 180, height: 180, display: 'grid', placeItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--blob1)', filter: 'blur(40px)', opacity: 0.8 }} />
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
    </div>
  );
}
