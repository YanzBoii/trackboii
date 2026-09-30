import { useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { PACES } from '../lib/goals.js';
import { IC, Icon, fmt } from '../components/ui.jsx';

export function goalMacros(t) {
  return [
    { k: 'Protéines', g: t.p, share: Math.round((t.p * 4 / t.kcal) * 100) },
    { k: 'Glucides', g: t.c, share: Math.round((t.c * 4 / t.kcal) * 100) },
    { k: 'Lipides', g: t.f, share: Math.round((t.f * 9 / t.kcal) * 100) }
  ];
}

export default function Plan() {
  const navigate = useNavigate();
  const { profile } = useData();
  const t = profile.targets;
  const pace = PACES.find(p => p.id === profile.pace);
  const phrase = profile.goal === 'perte' ? `perdre environ ${pace?.t.replace(' par semaine', '')} par semaine`
    : profile.goal === 'muscle' ? 'prendre du muscle sans trop de gras' : 'garder ton poids';

  return (
    <div className="narrow-620 full-h col" style={{ gap: 18 }}>
      <div className="col gap6">
        <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 500 }}>Ton plan est prêt</div>
        <h1 className="big">Voici ce dont tu as besoin chaque jour pour {phrase}.</h1>
      </div>
      <div className="hero col gap4" style={{ padding: 28, borderRadius: 32 }}>
        <div className="hero-glow" style={{ width: 240, height: 240, right: -60, top: -90 }} />
        <div className="hero-mute" style={{ position: 'relative', fontSize: 14 }}>Calories par jour</div>
        <div style={{ position: 'relative', fontSize: 64, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1 }}>
          {fmt(t.kcal)}<span className="hero-mute" style={{ fontSize: 18, fontWeight: 400 }}> kcal</span>
        </div>
      </div>
      <div className="macro-grid">
        {goalMacros(t).map(m => (
          <div key={m.k} className="glass body-field" style={{ gap: 2 }}>
            <div className="field-label">{m.k}</div>
            <div style={{ fontSize: 26, fontWeight: 600 }}>{m.g} g</div>
            <div className="small mute2">{m.share} % des kcal</div>
          </div>
        ))}
      </div>
      <div className="note">Calculé à partir de ton métabolisme de base et de ton niveau d'activité. Tu pourras l'ajuster à tout moment depuis ton profil.</div>
      <button className="btn btn-primary split" style={{ marginTop: 'auto', padding: '18px 24px' }} onClick={() => navigate('/', { replace: true })}>
        <span>C'est parti</span><Icon d={IC.next} />
      </button>
    </div>
  );
}
