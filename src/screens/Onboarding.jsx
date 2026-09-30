import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { ACTS, GOALS, PACES, computeTargets } from '../lib/goals.js';
import { BackButton, IC, Icon, Logo, Seg } from '../components/ui.jsx';

function Options({ list, value, onChange }) {
  return (
    <div className="col gap10">
      {list.map(o => (
        <button key={o.id} type="button" className={`opt ${value === o.id ? 'on' : ''}`} onClick={() => onChange(o.id)}>
          <div className="grow col" style={{ gap: 2 }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{o.t}</div>
            <div className="sub">{o.d}</div>
          </div>
          <div className="radio" />
        </button>
      ))}
    </div>
  );
}

const BODY = [['age', 'Âge', 'ans', 12, 100], ['height', 'Taille', 'cm', 120, 230], ['weight', 'Poids', 'kg', 30, 300]];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, saveProfile, addWeight } = useData();
  const [step, setStep] = useState(0);
  const [a, setA] = useState({
    goal: profile?.goal || 'perte', activity: profile?.activity || 'modere', pace: profile?.pace || 'reco',
    sex: profile?.sex || 'h', age: profile?.age ?? '', height: profile?.height ?? '', weight: profile?.weight ?? ''
  });
  const [error, setError] = useState('');
  useEffect(() => { document.querySelector('.main')?.scrollTo(0, 0); }, [step]);
  const set =(k, v) => setA(s => ({ ...s, [k]: v }));
  const total = a.goal === 'maintien' ? 3 : 4;

  const bodyValid = () => BODY.every(([k, , , min, max]) => {
    const n = Number(String(a[k]).replace(',', '.'));
    return n >= min && n <= max;
  });

  const finish = () => {
    const body = Object.fromEntries(BODY.map(([k]) => [k, Number(String(a[k]).replace(',', '.'))]));
    const answers = { ...a, ...body };
    const name = profile?.name || user.displayName?.split(' ')[0] || '';
    saveProfile({ ...answers, name, targets: computeTargets(answers), onboarded: true }).catch(() => {});
    addWeight(body.weight).catch(() => {});
    navigate('/plan', { replace: true });
  };

  const next = () => {
    setError('');
    if (step === 2 && !bodyValid()) return setError('Vérifie ton âge, ta taille et ton poids.');
    if (step >= total) return finish();
    setStep(step + 1);
  };

  const titles = {
    1: ['Quel est ton objectif ?', 'On adapte tes calories et tes macros en fonction.'],
    2: ['Parle-nous un peu de toi', 'Ces infos servent uniquement à calculer tes besoins.'],
    3: ["Quel est ton niveau d'activité ?", 'Sport et déplacements compris.'],
    4: [a.goal === 'perte' ? 'À quel rythme veux-tu perdre ?' : 'À quel rythme veux-tu progresser ?', 'Tu pourras le changer plus tard.']
  };

  return (
    <div className="narrow full-h col" style={{ gap: 22 }}>
      {step === 0 ? (
        <>
          <div className="welcome-art glass" style={{ height: 280 }}>
            <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'var(--accent)', filter: 'blur(70px)', opacity: 0.35 }} />
            <div className="plate" />
          </div>
          <div className="col gap12">
            <Logo size={48} text={26} />
            <h1 className="big" style={{ fontSize: 36 }}>Prends ton plat en photo. On s'occupe du reste.</h1>
            <div style={{ fontSize: 16, color: 'var(--mute)', lineHeight: 1.45 }}>Réponds à quelques questions et TrackBoii calcule les calories et les macros dont tu as besoin pour ton objectif.</div>
          </div>
        </>
      ) : (
        <>
          <div className="row gap12" style={{ gap: 14 }}>
            <BackButton onClick={() => setStep(step - 1)} />
            <div className="bar md grow"><div style={{ width: `${(step / total) * 100}%`, transition: 'width .3s' }} /></div>
            <div className="sub nowrap">{step} / {total}</div>
          </div>
          <div className="col gap6">
            <h1 className="big">{titles[step][0]}</h1>
            <div style={{ fontSize: 15, color: 'var(--mute)' }}>{titles[step][1]}</div>
          </div>
          {step === 1 && <Options list={GOALS} value={a.goal} onChange={v => set('goal', v)} />}
          {step === 2 && (
            <div className="col gap16">
              <Seg className="lg" options={[['h', 'Homme'], ['f', 'Femme'], ['x', 'Autre']]} value={a.sex} onChange={v => set('sex', v)} />
              <div className="macro-grid">
                {BODY.map(([k, label, unit]) => (
                  <label key={k} className="body-field glass">
                    <span className="field-label">{label}</span>
                    <span className="row gap4" style={{ alignItems: 'baseline' }}>
                      <input inputMode="decimal" value={a[k]} onChange={e => set(k, e.target.value.replace(/[^\d.,]/g, ''))} placeholder="–" />
                      <span className="mute2" style={{ fontSize: 14 }}>{unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {step === 3 && <Options list={ACTS} value={a.activity} onChange={v => set('activity', v)} />}
          {step === 4 && <Options list={PACES} value={a.pace} onChange={v => set('pace', v)} />}
          {error && <div className="error">{error}</div>}
        </>
      )}
      <button className="btn btn-primary split" style={{ marginTop: 'auto', padding: '18px 24px' }} onClick={next}>
        <span>{step === 0 ? 'Commencer' : step >= total ? 'Voir mon plan' : 'Continuer'}</span><Icon d={IC.next} />
      </button>
    </div>
  );
}
