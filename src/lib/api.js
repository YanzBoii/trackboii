import { DEMO, auth } from '../firebase.js';

export async function analyzeMeal({ image, name, weight, ingredients }) {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 2200));
    return { name: name || 'Bowl poulet, riz & avocat', weight: Number(weight) || 420, ingredients: ['poulet', 'riz basmati', 'avocat', 'sauce soja'], kcal: 640, p: 42, c: 68, f: 22, confidence: 86, comment: 'Belle assiette, bien équilibrée. Si tu la manges souvent, garde-la en preset.', isFood: true };
  }
  const token = await auth.currentUser?.getIdToken();
  let res;
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ image, mimeType: 'image/jpeg', name, weight, ingredients })
    });
  } catch {
    throw new Error('Pas de connexion internet.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}
