import { lastDays } from './dates.js';

export const sumMeals = meals => meals.reduce(
  (a, m) => ({ kcal: a.kcal + (m.kcal || 0), p: a.p + (m.p || 0), c: a.c + (m.c || 0), f: a.f + (m.f || 0) }),
  { kcal: 0, p: 0, c: 0, f: 0 }
);

/** Totaux par jour sur `count` jours, du plus ancien au plus récent. */
export function dailyTotals(meals, count, today) {
  const byDay = {};
  for (const m of meals) (byDay[m.date] ||= []).push(m);
  return lastDays(count, today).map(date => ({ date, meals: byDay[date] || [], ...sumMeals(byDay[date] || []) }));
}

/** Moyenne sur les jours passés renseignés ; à défaut, sur aujourd'hui. */
export function averageDays(days) {
  const past = days.slice(0, -1).filter(d => d.meals.length);
  const pool = past.length ? past : days.filter(d => d.meals.length);
  if (!pool.length) return { kcal: 0, p: 0, c: 0, f: 0, n: 0 };
  const t = pool.reduce((a, d) => ({ kcal: a.kcal + d.kcal, p: a.p + d.p, c: a.c + d.c, f: a.f + d.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const n = pool.length;
  return { kcal: t.kcal / n, p: t.p / n, c: t.c / n, f: t.f / n, n };
}

export function dayStatus(kcal, target, isToday) {
  if (isToday) return 'current';
  if (Math.abs(kcal - target) <= Math.max(120, target * 0.06)) return 'ok';
  return kcal > target ? 'over' : 'under';
}
