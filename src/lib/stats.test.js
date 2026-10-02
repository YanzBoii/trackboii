import { describe, it, expect } from 'vitest';
import { computeTargets } from './goals.js';
import { addDays, lastDays, momentForNow } from './dates.js';
import { dailyTotals, averageDays, dayStatus } from './stats.js';
import { normalizeResult, buildPrompt } from '../../shared/nutrition.js';

describe('computeTargets', () => {
  const base = { sex: 'h', age: 24, height: 178, weight: 78, activity: 'modere', pace: 'reco' };
  it('maintien = BMR x activité', () => {
    // BMR = 780 + 1112.5 - 120 + 5 = 1777.5 ; x1.55 = 2755
    expect(computeTargets({ ...base, goal: 'maintien' }).kcal).toBe(2760);
  });
  it('perte = maintien - 550', () => {
    expect(computeTargets({ ...base, goal: 'perte' }).kcal).toBe(2210);
  });
  it('macros cohérentes avec les kcal', () => {
    const t = computeTargets({ ...base, goal: 'muscle' });
    expect(t.p).toBe(156);
    expect(Math.abs(t.p * 4 + t.c * 4 + t.f * 9 - t.kcal)).toBeLessThan(10);
  });
  it('plancher de sécurité', () => {
    expect(computeTargets({ sex: 'f', age: 60, height: 150, weight: 45, goal: 'perte', activity: 'sedentaire', pace: 'rapide' }).kcal).toBe(1200);
  });
});

describe('dates', () => {
  it('addDays traverse les mois', () => expect(addDays('2026-09-30', 1)).toBe('2026-10-01'));
  it("lastDays finit aujourd'hui", () => expect(lastDays(3, '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']));
  it("moment selon l'heure", () => {
    expect(momentForNow(new Date(2026, 0, 1, 8))).toBe('pdj');
    expect(momentForNow(new Date(2026, 0, 1, 12))).toBe('dej');
    expect(momentForNow(new Date(2026, 0, 1, 20))).toBe('din');
  });
});

describe('stats', () => {
  const meals = [
    { date: '2026-09-29', kcal: 2000, p: 100, c: 200, f: 70 },
    { date: '2026-09-28', kcal: 1000, p: 50, c: 100, f: 30 },
    { date: '2026-09-28', kcal: 1200, p: 60, c: 120, f: 40 },
    { date: '2026-09-30', kcal: 500, p: 20, c: 60, f: 10 }
  ];
  it('agrège par jour', () => {
    expect(dailyTotals(meals, 3, '2026-09-30').map(x => x.kcal)).toEqual([2200, 2000, 500]);
  });
  it("moyenne sans aujourd'hui", () => {
    expect(averageDays(dailyTotals(meals, 3, '2026-09-30')).kcal).toBe(2100);
  });
  it('statut', () => {
    expect(dayStatus(2050, 2000, false)).toBe('ok');
    expect(dayStatus(2500, 2000, false)).toBe('over');
    expect(dayStatus(1500, 2000, false)).toBe('under');
  });
});

describe('nutrition', () => {
  it('normalise une réponse IA', () => {
    const r = normalizeResult('{"name":"Bowl","weight":"420.4","ingredients":["riz"],"kcal":640.6,"p":-3,"c":68,"f":22,"confidence":86,"comment":"ok","isFood":true}');
    expect(r).toMatchObject({ weight: 420, kcal: 641, p: 0, isFood: true });
  });
  it('le prompt inclut les précisions', () => {
    expect(buildPrompt({ weight: '420', ingredients: 'poulet', hasImage: true })).toContain('420 g');
  });
});

describe('validation', async () => {
  const { passwordProblem, csvCell } = await import('./validation.js');
  it('refuse les mots de passe faibles', () => {
    expect(passwordProblem('1234567')).toBeTruthy();
    expect(passwordProblem('12345678')).toBeTruthy();
    expect(passwordProblem('motdepasse')).toBeTruthy();
    expect(passwordProblem('éclair2026')).toBeNull();
  });
  it('neutralise les formules dans le CSV', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('Pâtes')).toBe('"Pâtes"');
  });
});
