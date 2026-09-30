import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { MOMENTS, MOMENT_ADD, MOMENT_PHRASE, useUi } from '../data/UiContext.jsx';
import { longToday, momentForNow } from '../lib/dates.js';
import { sumMeals } from '../lib/stats.js';
import MealSheet from '../components/MealSheet.jsx';
import { Bar, IC, Icon, Thumb, fmt, macroLine, pct } from '../components/ui.jsx';

const ORDER = { pdj: 0, dej: 1, col: 2, din: 3 };

function coachMessage(remaining, tot, t) {
  if (tot.kcal === 0) return 'Nouvelle journée. Prends ton premier repas en photo pour commencer.';
  if (remaining <= 0) return tot.kcal - t.kcal > 250 ? 'Objectif dépassé aujourd\'hui. Pas grave : c\'est la moyenne de la semaine qui compte.' : "Objectif atteint pour aujourd'hui. Bien joué.";
  if (remaining > 600 && t.p - tot.p > 40) return 'Très bien parti. Un repas riche en protéines et ta journée est bouclée.';
  if (remaining > 600) return 'Très bien parti. Il te reste de la marge pour un vrai repas.';
  return 'Presque au bout : une collation légère suffit.';
}

export function usePresetAdder() {
  const { addMeal } = useData();
  const { showToast } = useUi();
  return (p, moment = momentForNow()) => {
    addMeal({
      moment, name: p.name, kcal: p.kcal, p: p.p, c: p.c, f: p.f, weight: p.weight || 0,
      ingredients: p.ingredients || [], thumb: p.thumb || null, source: 'Preset'
    }).catch(() => showToast('Erreur de synchronisation'));
    showToast(`${p.name} ajouté ${MOMENT_PHRASE[moment]}`);
  };
}

export default function Today() {
  const navigate = useNavigate();
  const { profile, todayMeals, presets } = useData();
  const addPreset = usePresetAdder();
  const [editing, setEditing] = useState(null);
  const t = profile.targets;
  const tot = sumMeals(todayMeals);
  const remaining = Math.max(0, t.kcal - tot.kcal);
  const dayPct = Math.min(100, pct(tot.kcal, t.kcal));
  const meals = [...todayMeals].sort((a, b) => (ORDER[a.moment] ?? 9) - (ORDER[b.moment] ?? 9));
  const nextMoment = momentForNow();
  const initial = (profile.name || '?').charAt(0).toUpperCase();

  return (
    <div className="stack">
      <div className="row between gap16">
        <div className="col">
          <div className="sub">{longToday()}</div>
          <h1 className="h1">Salut {profile.name || 'toi'}</h1>
        </div>
        <button className="avatar" style={{ width: 44, height: 44, fontSize: 18 }} onClick={() => navigate('/profil')} aria-label="Profil">{initial}</button>
      </div>

      <div className="grid-main">
        <div className="col gap12">
          <div className="hero row" style={{ gap: 22 }}>
            <div className="hero-glow" />
            <div className="ring" style={{ background: `conic-gradient(from 200deg,#6fa0ff,#b9d0ff ${dayPct}%, rgba(255,255,255,.1) 0)` }}>
              <div className="ring-in">
                <div style={{ fontSize: 30, fontWeight: 600 }}>{fmt(remaining)}</div>
                <div className="hero-mute" style={{ fontSize: 11 }}>restantes</div>
              </div>
            </div>
            <div className="col gap4" style={{ position: 'relative' }}>
              <div className="hero-mute" style={{ fontSize: 12 }}>Consommées</div>
              <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1 }}>{fmt(tot.kcal)}</div>
              <div className="hero-mute" style={{ fontSize: 13 }}>sur {fmt(t.kcal)} kcal</div>
            </div>
          </div>

          <div className="macro-grid">
            {[['Protéines', tot.p, t.p], ['Glucides', tot.c, t.c], ['Lipides', tot.f, t.f]].map(([k, v, target]) => (
              <div key={k} className="macro glass">
                <div className="small">{k}</div>
                <div className="nowrap" style={{ fontSize: 21, fontWeight: 600 }}>{Math.round(v)}<span className="mute2" style={{ fontSize: 11, fontWeight: 400 }}> / {target} g</span></div>
                <Bar pct={pct(v, target)} />
              </div>
            ))}
          </div>

          <div className="glass r20 row gap12" style={{ padding: '14px 16px' }}>
            <div className="coach-ic"><Icon d={IC.star} size={18} /></div>
            <div style={{ fontSize: 14, lineHeight: 1.4, textWrap: 'pretty' }}>{coachMessage(t.kcal - tot.kcal, tot, t)}</div>
          </div>
        </div>

        <div className="col gap10">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <div className="h3">Repas du jour</div>
            <button className="link" onClick={() => navigate('/historique')}>Historique</button>
          </div>
          {meals.length === 0 && <div className="empty">Aucun repas pour l'instant.</div>}
          {meals.map(m => (
            <button key={m.id} className="meal-row" onClick={() => setEditing(m)}>
              <Thumb src={m.thumb} />
              <div className="grow col" style={{ gap: 1 }}>
                <div className="small mute2">{MOMENTS[m.moment] || 'Repas'} · {m.source || 'IA'}</div>
                <div style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                <div className="small">{macroLine(m)}</div>
              </div>
              <div className="nowrap" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(m.kcal)} kcal</div>
            </button>
          ))}
          <button className="dashed" onClick={() => navigate('/ajouter')}><Icon d={IC.plus} size={18} width={2.2} />Ajouter {MOMENT_ADD[nextMoment]}</button>

          {presets.length > 0 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>Presets rapides</div>
              <div className="row wrap gap8">
                {presets.map(p => (
                  <button key={p.id} className="chip" onClick={() => addPreset(p, nextMoment)}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>+</span>{p.name}<span className="mute2">{fmt(p.kcal)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {editing && <MealSheet meal={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
