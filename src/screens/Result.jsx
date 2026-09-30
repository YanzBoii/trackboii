import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { MOMENTS, MOMENT_PHRASE, useUi } from '../data/UiContext.jsx';
import { BackButton, IC, Icon, Seg } from '../components/ui.jsx';

const digits = v => v.replace(/[^\d]/g, '');

export default function Result() {
  const navigate = useNavigate();
  const { addMeal, addPreset } = useData();
  const { draft, patchDraft, resetDraft, showToast } = useUi();
  const [r, setR] = useState(draft.result);
  const [saved, setSaved] = useState(false);
  const [newIng, setNewIng] = useState(null);

  if (!r) return <Navigate to="/ajouter" replace />;

  const set = (k, v) => { setR(s => ({ ...s, [k]: v })); setSaved(false); };
  const n = k => Math.max(0, Math.round(Number(r[k]) || 0));
  const fromAI = r.confidence != null;
  const photo = draft.photo;

  // Ajuster le poids recalcule les valeurs proportionnellement
  const setWeight = v => {
    const w = Number(digits(v)) || 0;
    const old = n('weight');
    if (old > 0 && w > 0) {
      const k = w / old;
      setR(s => ({ ...s, weight: w, kcal: Math.round(s.kcal * k), p: Math.round(s.p * k), c: Math.round(s.c * k), f: Math.round(s.f * k) }));
    } else {
      set('weight', w);
    }
    setSaved(false);
  };

  const payload = () => ({
    name: String(r.name).trim() || 'Repas', kcal: n('kcal'), p: n('p'), c: n('c'), f: n('f'), weight: n('weight'),
    ingredients: r.ingredients, thumb: photo?.thumb || null
  });
  const fail = () => showToast('Erreur de synchronisation');

  const add = () => {
    addMeal({ ...payload(), moment: draft.moment, source: fromAI ? 'IA' : 'Manuel' }).catch(fail);
    showToast('Ajouté ' + MOMENT_PHRASE[draft.moment]);
    resetDraft();
    navigate('/', { replace: true });
  };
  const savePreset = () => {
    if (saved) return;
    const p = payload();
    addPreset({ ...p, items: [p.weight ? `${p.weight} g` : null, r.ingredients.join(', ')].filter(Boolean).join(' · ') }).catch(fail);
    setSaved(true);
    showToast('Enregistré dans tes presets');
  };
  const retry = () => {
    patchDraft({ result: null, name: r.name || draft.name, ingredients: draft.ingredients || r.ingredients.join(', '), weight: r.weight ? String(r.weight) : draft.weight });
    navigate('/ajouter', { replace: true });
  };

  const macroIn = (k, label) => (
    <label key={k} className="mini">
      <span className="small">{label}</span>
      <span className="row"><input className="bare" inputMode="numeric" value={r[k]} onChange={e => set(k, digits(e.target.value))} style={{ fontSize: 17, fontWeight: 600, width: '100%' }} /><span className="mute2" style={{ fontSize: 13 }}>g</span></span>
    </label>
  );

  return (
    <div className="stack">
      <div className="row" style={{ gap: 14 }}>
        <BackButton onClick={retry} />
        <h1 className="h2 grow">Résultat</h1>
        {fromAI && <div className="badge">IA · confiance {r.confidence} %</div>}
      </div>

      <div className="grid-main">
        <div className="col">
          {photo && <div className="result-photo" style={{ backgroundImage: `url(data:image/jpeg;base64,${photo.ai})` }} />}
          <div className={`result-card ${photo ? '' : 'no-photo'}`}>
            <input className="bare" value={r.name} onChange={e => set('name', e.target.value)} placeholder="Nom du plat" style={{ fontSize: 20, fontWeight: 600 }} aria-label="Nom du plat" />
            <div className="row gap6" style={{ alignItems: 'baseline', marginTop: 4 }}>
              <input className="bare kcal-big" inputMode="numeric" value={r.kcal} onChange={e => set('kcal', digits(e.target.value))} style={{ width: `${Math.max(1, String(r.kcal).length) * 0.58 + 0.1}em` }} aria-label="Calories" />
              <div style={{ fontSize: 15, color: 'var(--mute)' }}>kcal</div>
            </div>
            <div className="macro-grid" style={{ gap: 8, marginTop: 12 }}>
              {macroIn('p', 'Protéines')}{macroIn('c', 'Glucides')}{macroIn('f', 'Lipides')}
            </div>
          </div>
        </div>

        <div className="col gap12">
          <div className="glass col gap12" style={{ padding: 20, borderRadius: 26 }}>
            <div className="h3" style={{ fontSize: 16 }}>Précisions</div>
            <label className="kv">
              <span className="sub">{fromAI ? 'Poids estimé' : 'Poids'}</span>
              <span className="row gap4"><input className="bare" inputMode="numeric" value={r.weight || ''} onChange={e => setWeight(e.target.value)} placeholder="–" style={{ textAlign: 'right', fontSize: 15, fontWeight: 600, width: 70 }} /><span style={{ fontWeight: 600 }}>g</span></span>
            </label>
            <div className="row wrap gap6">
              {r.ingredients.map((ing, i) => (
                <span key={i} className="chip" style={{ cursor: 'default', padding: '7px 13px' }}>
                  {ing}<button className="chip-x" aria-label={`Retirer ${ing}`} onClick={() => set('ingredients', r.ingredients.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
              {newIng === null ? (
                <button className="chip chip-add" style={{ padding: '7px 13px' }} onClick={() => setNewIng('')}>+ ingrédient</button>
              ) : (
                <input
                  className="chip" autoFocus value={newIng} placeholder="ex. huile d'olive" style={{ padding: '7px 13px', outline: 'none', minWidth: 140 }}
                  onChange={e => setNewIng(e.target.value)}
                  onBlur={() => { if (newIng.trim()) set('ingredients', [...r.ingredients, newIng.trim()]); setNewIng(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setNewIng(null); }}
                />
              )}
            </div>
            {fromAI && <div className="small" style={{ lineHeight: 1.4 }}>Tu peux corriger chaque valeur. Si tu modifies le poids, les calories et les macros suivent.</div>}
          </div>

          {r.comment && <div className="note">{r.comment}</div>}

          <div className="field"><span className="field-label">Moment</span>
            <Seg options={Object.entries(MOMENTS)} value={draft.moment} onChange={v => patchDraft({ moment: v })} />
          </div>
          <button className="btn btn-primary" onClick={add}>Ajouter {MOMENT_PHRASE[draft.moment]}</button>
          <button className="btn btn-ghost" style={{ fontSize: 16, padding: '16px 24px' }} onClick={savePreset}>
            <Icon d={IC.presets} size={18} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Enregistré dans tes presets' : 'Enregistrer en preset'}
          </button>
          {fromAI && <button className="link" style={{ alignSelf: 'center' }} onClick={retry}>Relancer avec plus de précisions</button>}
        </div>
      </div>
    </div>
  );
}
