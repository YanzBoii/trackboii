import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../data/DataContext.jsx';
import { MOMENTS } from '../data/UiContext.jsx';
import { dayLabel } from '../lib/dates.js';
import { dailyTotals, dayStatus } from '../lib/stats.js';
import MealSheet from '../components/MealSheet.jsx';
import { BackButton, Bar, Thumb, fmt, pct } from '../components/ui.jsx';

const STATUS = { current: 'En cours', ok: "Dans l'objectif", over: 'Au-dessus', under: 'En dessous' };
const BAR = { current: 'var(--accent)', ok: 'var(--bar)', over: 'var(--warn)', under: 'var(--bar)' };

export default function History() {
  const navigate = useNavigate();
  const { meals, profile, today } = useData();
  const [open, setOpen] = useState(today);
  const [editing, setEditing] = useState(null);
  const t = profile.targets;
  const days = dailyTotals(meals, 10, today).reverse();

  return (
    <div className="stack">
      <div className="row" style={{ gap: 14 }}>
        <span className="mobile-only"><BackButton onClick={() => navigate('/')} /></span>
        <div className="col">
          <h1 className="h1">Historique</h1>
          <div className="sub">Tes 10 derniers jours</div>
        </div>
      </div>
      <div className="col gap10">
        {days.map(d => {
          const st = dayStatus(d.kcal, t.kcal, d.date === today);
          const isOpen = open === d.date;
          return (
            <div key={d.date} className="day glass">
              <div className="day-head" onClick={() => setOpen(isOpen ? null : d.date)} role="button" aria-expanded={isOpen}>
                <div className="col" style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{dayLabel(d.date, today)}</div>
                  <div className="sub" style={{ fontSize: 13 }}>{d.meals.length} repas · P {Math.round(d.p)} g · G {Math.round(d.c)} g · L {Math.round(d.f)} g</div>
                </div>
                <div className="col gap6" style={{ flex: '1 1 200px' }}>
                  <div className="row between" style={{ fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{fmt(d.kcal)} kcal</span>
                    {(d.meals.length > 0 || st === 'current') && <span className={`tag ${st}`}>{STATUS[st]}</span>}
                  </div>
                  <Bar className="md" pct={pct(d.kcal, t.kcal)} color={BAR[st]} />
                </div>
              </div>
              {isOpen && d.meals.length > 0 && (
                <div className="col gap8">
                  {d.meals.map(m => (
                    <button key={m.id} className="meal-row" style={{ background: 'var(--glass-strong)' }} onClick={() => setEditing(m)}>
                      <Thumb src={m.thumb} style={{ width: 38, height: 38, borderRadius: 12 }} />
                      <div className="grow col">
                        <div className="small mute2">{MOMENTS[m.moment] || 'Repas'}</div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                      </div>
                      <div className="nowrap" style={{ fontSize: 14, fontWeight: 600 }}>{fmt(m.kcal)} kcal</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {editing && <MealSheet meal={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
