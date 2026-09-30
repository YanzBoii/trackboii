import { useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { useUi } from '../data/UiContext.jsx';
import { usePresetAdder } from './Today.jsx';
import { IC, Icon, Thumb, fmt } from '../components/ui.jsx';

export default function Presets() {
  const navigate = useNavigate();
  const { presets, deletePreset } = useData();
  const { showToast } = useUi();
  const addPreset = usePresetAdder();

  const remove = p => {
    if (!window.confirm(`Supprimer le preset « ${p.name} » ?`)) return;
    deletePreset(p.id).catch(() => showToast('Erreur de synchronisation'));
    showToast('Preset supprimé');
  };

  return (
    <div className="stack">
      <div className="row between wrap gap16" style={{ alignItems: 'flex-end' }}>
        <div className="col">
          <h1 className="h1">Presets</h1>
          <div className="sub">Tes repas habituels, ajoutés en un geste.</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/ajouter')}>+ Nouveau preset</button>
      </div>
      {presets.length === 0 && (
        <div className="empty">Pas encore de preset. Après une analyse, touche « Enregistrer en preset » pour retrouver ce repas ici.</div>
      )}
      <div className="preset-grid">
        {presets.map(p => (
          <div key={p.id} className="preset glass">
            <Thumb src={p.thumb} className="preset-img" />
            <button className="preset-del" onClick={() => remove(p)} aria-label={`Supprimer ${p.name}`}><Icon d={IC.trash} size={15} /></button>
            <div className="col" style={{ padding: '0 6px', gap: 2 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</div>
              {p.items && <div className="sub" style={{ fontSize: 13, lineHeight: 1.35 }}>{p.items}</div>}
            </div>
            <div className="row between gap8" style={{ padding: '0 6px', marginTop: 'auto' }}>
              <div className="col">
                <div style={{ fontSize: 22, fontWeight: 600 }}>{fmt(p.kcal)}</div>
                <div className="small mute2">P {p.p} · G {p.c} · L {p.f}</div>
              </div>
              <button className="pill-add" onClick={() => addPreset(p)}>Ajouter</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
