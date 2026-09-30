import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useData } from '../data/DataContext.jsx';
import { MOMENTS, useUi } from '../data/UiContext.jsx';
import { goalSummary } from '../lib/goals.js';
import { goalMacros } from './Plan.jsx';
import { IC, Icon, Seg, fmt } from '../components/ui.jsx';

function GoalsEditor({ targets, onSave, onCancel }) {
  const [v, setV] = useState({ ...targets });
  const fields = [['kcal', 'Calories', 'kcal'], ['p', 'Protéines', 'g'], ['c', 'Glucides', 'g'], ['f', 'Lipides', 'g']];
  return (
    <div className="col gap12">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
        {fields.map(([k, label, unit]) => (
          <label key={k} className="field"><span className="field-label">{label}</span>
            <div className="input-unit"><input className="input" inputMode="numeric" value={v[k]} onChange={e => setV(s => ({ ...s, [k]: e.target.value.replace(/[^\d]/g, '') }))} /><span>{unit}</span></div>
          </label>
        ))}
      </div>
      <div className="row gap8">
        <button className="btn btn-ghost btn-sm grow" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary btn-sm grow" onClick={() => onSave(Object.fromEntries(fields.map(([k]) => [k, Number(v[k]) || 0])))}>Enregistrer</button>
      </div>
    </div>
  );
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, saveProfile, logout } = useData();
  const { theme, setTheme, showToast } = useUi();
  const [editing, setEditing] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const t = profile.targets;

  const exportCsv = async () => {
    try {
      const snap = await getDocs(collection(db, 'users', user.uid, 'meals'));
      const rows = snap.docs.map(d => d.data()).sort((a, b) => a.date.localeCompare(b.date));
      const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
      const csv = ['date;moment;plat;kcal;proteines_g;glucides_g;lipides_g;poids_g;ingredients;source']
        .concat(rows.map(m => [m.date, MOMENTS[m.moment] || '', esc(m.name), m.kcal, m.p, m.c, m.f, m.weight || '', esc((m.ingredients || []).join(', ')), m.source || ''].join(';')))
        .join('\n');
      download(`trackboii-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    } catch {
      showToast('Export impossible hors connexion');
    }
  };

  const saveName = () => {
    if (editingName.trim()) saveProfile({ name: editingName.trim() }).catch(() => {});
    setEditingName(null);
  };

  return (
    <div className="stack">
      <div className="row gap16">
        <div className="avatar" style={{ width: 68, height: 68, fontSize: 28, cursor: 'default' }}>{(profile.name || '?').charAt(0).toUpperCase()}</div>
        <div className="col grow">
          {editingName === null ? (
            <button className="bare h2" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setEditingName(profile.name || '')} title="Modifier le prénom">{profile.name || 'Ton prénom'}</button>
          ) : (
            <input className="bare h2" autoFocus value={editingName} onChange={e => setEditingName(e.target.value)} onBlur={saveName} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
          )}
          <div className="sub">{goalSummary(profile)}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="glass card col gap12" style={{ gap: 14 }}>
          <div className="row between"><div className="sub">Mes objectifs quotidiens</div>{!editing && <button className="link" onClick={() => setEditing(true)}>Ajuster</button>}</div>
          {editing ? (
            <GoalsEditor targets={t} onCancel={() => setEditing(false)} onSave={targets => { saveProfile({ targets }).catch(() => {}); setEditing(false); showToast('Objectifs mis à jour'); }} />
          ) : (
            <>
              <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1 }}>{fmt(t.kcal)} <span className="sub" style={{ fontSize: 16, fontWeight: 400 }}>kcal</span></div>
              <div className="macro-grid" style={{ gap: 8 }}>
                {goalMacros(t).map(m => <div key={m.k} className="mini" style={{ padding: 12, borderRadius: 16 }}><div className="small">{m.k}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{m.g} g</div></div>)}
              </div>
            </>
          )}
          <button className="btn btn-ghost" onClick={() => navigate('/bienvenue')}>Refaire le questionnaire</button>
        </div>

        <div className="glass col" style={{ padding: '8px 22px', borderRadius: 28 }}>
          <div className="settings-row"><span>Apparence</span><Seg className="inline" options={[['light', 'Clair'], ['dark', 'Sombre']]} value={theme} onChange={setTheme} /></div>
          <div className="settings-row"><span>Compte</span><span className="sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span></div>
          <div className="settings-row"><span>Unités</span><span className="sub">Métrique (kg, g)</span></div>
          <button className="settings-row" style={{ cursor: 'pointer' }} onClick={exportCsv}><span>Exporter mes données</span><span className="mute2"><Icon d={IC.chevron} size={18} /></span></button>
          <button className="settings-row sub" style={{ cursor: 'pointer', color: 'var(--mute)' }} onClick={logout}>Se déconnecter</button>
        </div>
      </div>
    </div>
  );
}
