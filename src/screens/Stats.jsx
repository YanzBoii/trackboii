import { useState } from 'react';
import { useData } from '../data/DataContext.jsx';
import { useUi } from '../data/UiContext.jsx';
import { parseKey } from '../lib/dates.js';
import { averageDays, dailyTotals } from '../lib/stats.js';
import { Bar, Seg, fmt, pct } from '../components/ui.jsx';

const WEEKDAY = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const kgFmt = v => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

function WeightCard() {
  const { weights, addWeight } = useData();
  const { showToast } = useUi();
  const [input, setInput] = useState(null);
  const recent = weights.slice(-12);
  const last = recent.at(-1);
  const first = recent[0];
  const diff = last && first && recent.length > 1 ? last.kg - first.kg : null;
  const weeks = first && last ? Math.max(1, Math.round((parseKey(last.date) - parseKey(first.date)) / (7 * 864e5))) : 0;

  let points = '';
  if (recent.length > 1) {
    const vals = recent.map(w => w.kg);
    const min = Math.min(...vals) - 0.3, max = Math.max(...vals) + 0.3;
    points = recent.map((w, i) => `${(i * 300 / (recent.length - 1)).toFixed(1)},${((max - w.kg) / (max - min) * 100).toFixed(1)}`).join(' ');
  }
  const monthOf = w => parseKey(w.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  const save = () => {
    const kg = Number(String(input).replace(',', '.'));
    if (!(kg >= 30 && kg <= 300)) return showToast('Poids invalide');
    addWeight(Math.round(kg * 10) / 10).catch(() => showToast('Erreur de synchronisation'));
    setInput(null);
    showToast('Pesée enregistrée');
  };

  return (
    <div className="glass card col gap10">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="col">
          <div className="sub">Poids</div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>{last ? kgFmt(last.kg) : '–'} <span className="sub" style={{ fontSize: 15 }}>kg</span></div>
        </div>
        {diff !== null && <div className="badge">{diff > 0 ? '+' : diff < 0 ? '−' : ''}{kgFmt(Math.abs(diff))} kg en {weeks} sem.</div>}
      </div>
      {points ? (
        <>
          <svg viewBox="0 0 300 100" preserveAspectRatio="none" style={{ width: '100%', height: 110, overflow: 'visible' }}>
            <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="row between mute2" style={{ fontSize: 11 }}><span>{monthOf(first)}</span><span>{monthOf(last)}</span></div>
        </>
      ) : (
        <div className="small" style={{ padding: '18px 0' }}>Ajoute des pesées régulièrement pour voir ta courbe.</div>
      )}
      {input === null ? (
        <button className="btn btn-ghost btn-sm" onClick={() => setInput(last ? String(last.kg).replace('.', ',') : '')}>Ajouter une pesée</button>
      ) : (
        <div className="row gap8">
          <div className="input-unit grow"><input className="input" autoFocus inputMode="decimal" value={input} onChange={e => setInput(e.target.value.replace(/[^\d.,]/g, ''))} onKeyDown={e => e.key === 'Enter' && save()} /><span>kg</span></div>
          <button className="btn btn-primary btn-sm" onClick={save}>OK</button>
        </div>
      )}
    </div>
  );
}

export default function Stats() {
  const { meals, profile, today } = useData();
  const [range, setRange] = useState('semaine');
  const t = profile.targets;
  const isWeek = range === 'semaine';
  const days = dailyTotals(meals, isWeek ? 7 : 30, today);
  const avg = averageDays(days);
  const scale = Math.max(t.kcal * 1.35, ...days.map(d => d.kcal));

  return (
    <div className="stack">
      <div className="row between wrap gap16">
        <h1 className="h1">Statistiques</h1>
        <Seg className="inline" options={[['semaine', 'Semaine'], ['mois', 'Mois']]} value={range} onChange={setRange} />
      </div>
      <div className="grid-2">
        <div className="span-all glass card col" style={{ gap: 18 }}>
          <div className="row between wrap gap12" style={{ alignItems: 'flex-end' }}>
            <div className="col">
              <div className="sub">Calories · moyenne par jour</div>
              <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-.02em' }}>{avg.n ? fmt(avg.kcal) : '–'} <span className="sub" style={{ fontSize: 15, fontWeight: 400 }}>kcal</span></div>
            </div>
            <div className="row small" style={{ gap: 14 }}>
              <span className="row gap6"><span className="legend" style={{ background: 'var(--bar)' }} />Dans l'objectif</span>
              <span className="row gap6"><span className="legend" style={{ background: 'var(--accent)' }} />Au-dessus</span>
            </div>
          </div>
          <div className="chart" style={{ gap: isWeek ? 14 : 4 }}>
            <div className="chart-goal" style={{ bottom: `calc(${(t.kcal / scale) * 89}% + 22px)` }} />
            {days.map((d, i) => {
              const date = parseKey(d.date);
              const label = isWeek ? WEEKDAY[date.getDay()] : (i % 5 === 0 || i === days.length - 1 ? String(date.getDate()) : '');
              return (
                <div key={d.date} className="chart-col" title={`${date.toLocaleDateString('fr-FR')} : ${fmt(d.kcal)} kcal`}>
                  <div className={`chart-bar ${d.kcal > t.kcal + 100 ? 'over' : ''}`} style={{ height: `${(d.kcal / scale) * 89}%`, borderRadius: isWeek ? 10 : 4, minHeight: d.kcal ? 4 : 0 }} />
                  <div className="chart-lbl">{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass card col gap16">
          <div className="sub">Macros · moyenne par jour</div>
          {[['Protéines', avg.p, t.p], ['Glucides', avg.c, t.c], ['Lipides', avg.f, t.f]].map(([k, v, target]) => (
            <div key={k} className="col" style={{ gap: 7 }}>
              <div className="row between" style={{ fontSize: 14 }}><span>{k}</span><span style={{ fontWeight: 600 }}>{Math.round(v)} g <span className="mute2" style={{ fontWeight: 400 }}>/ {target} g</span></span></div>
              <Bar className="lg" pct={pct(v, target)} />
            </div>
          ))}
          {!avg.n && <div className="small">Pas encore de données sur cette période.</div>}
        </div>

        <WeightCard />
      </div>
    </div>
  );
}
