export const GOALS = [
  { id: 'perte', t: 'Perdre du poids', d: 'Un déficit léger, sans frustration' },
  { id: 'maintien', t: 'Garder mon poids', d: 'Manger équilibré au quotidien' },
  { id: 'muscle', t: 'Prendre du muscle', d: 'Un surplus maîtrisé, protéines en priorité' }
];
export const ACTS = [
  { id: 'sedentaire', t: 'Sédentaire', d: 'Bureau, peu de marche', f: 1.2 },
  { id: 'leger', t: 'Léger', d: '1 à 2 séances par semaine', f: 1.375 },
  { id: 'modere', t: 'Modéré', d: '3 à 4 séances par semaine', f: 1.55 },
  { id: 'intense', t: 'Très actif', d: 'Du sport presque tous les jours', f: 1.725 }
];
export const PACES = [
  { id: 'doux', t: '0,25 kg par semaine', d: 'Tranquille, très facile à tenir', kg: 0.25 },
  { id: 'reco', t: '0,5 kg par semaine', d: 'Recommandé', kg: 0.5 },
  { id: 'rapide', t: '0,75 kg par semaine', d: 'Plus exigeant', kg: 0.75 }
];

const SEX_OFFSET = { h: 5, f: -161, x: -78 };

export function computeTargets({ sex = 'h', age, height, weight, goal = 'maintien', activity = 'modere', pace = 'reco' }) {
  const bmr = 10 * weight + 6.25 * height - 5 * age + (SEX_OFFSET[sex] ?? -78);
  const tdee = bmr * (ACTS.find(a => a.id === activity)?.f ?? 1.55);
  const delta = (PACES.find(p => p.id === pace)?.kg ?? 0.5) * 7700 / 7;
  let kcal = goal === 'perte' ? tdee - delta : goal === 'muscle' ? tdee + delta / 2 : tdee;
  kcal = Math.max(kcal, sex === 'h' ? 1500 : 1200);
  kcal = Math.round(kcal / 10) * 10;
  const p = Math.round(weight * (goal === 'maintien' ? 1.6 : 2));
  const f = Math.round(kcal * 0.28 / 9);
  const c = Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
  return { kcal, p, c, f };
}

export function goalSummary(profile) {
  if (!profile) return '';
  if (profile.goal === 'perte') return `Perte de poids · ${PACES.find(p => p.id === profile.pace)?.t ?? ''}`;
  if (profile.goal === 'muscle') return `Prise de muscle · ${PACES.find(p => p.id === profile.pace)?.t ?? ''}`;
  return 'Garder mon poids';
}
