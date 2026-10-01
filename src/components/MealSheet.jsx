import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../data/DataContext.jsx';
import { MOMENTS, useUi } from '../data/UiContext.jsx';
import { IC, Icon, Seg } from './ui.jsx';

const NUM_FIELDS = [['kcal', 'Calories', 'kcal'], ['p', 'Protéines', 'g'], ['c', 'Glucides', 'g'], ['f', 'Lipides', 'g']];

export default function MealSheet({ meal, onClose }) {
  const { updateMeal, deleteMeal, addPreset } = useData();
  const { showToast } = useUi();
  const [form, setForm] = useState({ name: meal.name, moment: meal.moment || 'dej', kcal: meal.kcal, p: meal.p, c: meal.c, f: meal.f });
  const set = (k, v) => setForm(s => ({ ...s, [k]: v }));
  const nums = Object.fromEntries(NUM_FIELDS.map(([k]) => [k, Math.max(0, Math.round(Number(form[k]) || 0))]));

  const fail = () => showToast('Erreur de synchronisation');
  const save = () => {
    updateMeal(meal.id, { name: form.name.trim() || 'Repas', moment: form.moment, ...nums }).catch(fail);
    showToast('Repas modifié');
    onClose();
  };
  const remove = () => {
    deleteMeal(meal.id).catch(fail);
    showToast('Repas supprimé');
    onClose();
  };
  const toPreset = () => {
    addPreset({
      name: form.name.trim() || 'Repas', ...nums, weight: meal.weight || 0,
      ingredients: meal.ingredients || [], items: (meal.ingredients || []).join(' · '), thumb: meal.thumb || null
    }).catch(fail);
    showToast('Enregistré dans tes presets');
  };

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Modifier le repas">
        <div className="row between">
          <div className="h3">Modifier le repas</div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon d={IC.close} size={18} /></button>
        </div>
        <Seg options={Object.entries(MOMENTS)} value={form.moment} onChange={v => set('moment', v)} />
        <label className="field"><span className="field-label">Nom</span>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          {NUM_FIELDS.map(([k, label, unit]) => (
            <label key={k} className="field"><span className="field-label">{label}</span>
              <div className="input-unit"><input className="input" inputMode="numeric" value={form[k]} onChange={e => set(k, e.target.value.replace(/[^\d]/g, ''))} /><span>{unit}</span></div>
            </label>
          ))}
        </div>
        <button className="btn btn-primary" onClick={save}>Enregistrer</button>
        <div className="row gap8">
          <button className="btn btn-ghost btn-sm grow" onClick={toPreset}><Icon d={IC.presets} size={16} />En preset</button>
          <button className="btn btn-ghost btn-sm btn-danger grow" onClick={remove}><Icon d={IC.trash} size={16} />Supprimer</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
