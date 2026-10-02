import { DEMO, auth } from '../firebase.js';

const TIMEOUT_MS = 20_000;

/** Erreur d'analyse ; `retryable` = vaut la peine de réessayer plus tard (réseau, IA saturée). */
export class AnalyzeError extends Error {
  constructor(message, retryable) {
    super(message);
    this.retryable = retryable;
  }
}

async function post(payload, forceRefresh) {
  let token;
  try {
    token = await auth.currentUser?.getIdToken(forceRefresh);
  } catch {
    throw new AnalyzeError('Pas de connexion internet.', true);
  }
  let res;
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new AnalyzeError(navigator.onLine ? 'Connexion trop lente.' : 'Pas de connexion internet.', true);
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  const retryable = data.retryable ?? (res.status >= 500 || res.status === 408);
  throw Object.assign(new AnalyzeError(data.error || `Erreur ${res.status}`, retryable), { status: res.status });
}

export async function analyzeMeal({ image, name, weight, ingredients }) {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 2200));
    return { name: name || 'Bowl poulet, riz & avocat', weight: Number(weight) || 420, ingredients: ['poulet', 'riz basmati', 'avocat', 'sauce soja'], kcal: 640, p: 42, c: 68, f: 22, confidence: 86, comment: 'Belle assiette, bien équilibrée. Si tu la manges souvent, garde-la en preset.', isFood: true };
  }
  if (!navigator.onLine) throw new AnalyzeError('Pas de connexion internet.', true);
  const payload = { image, mimeType: 'image/jpeg', name, weight, ingredients };
  try {
    return await post(payload, false);
  } catch (e) {
    // Jeton expiré : on le rafraîchit une fois
    if (e.status === 401) return post(payload, true);
    // Coupure ou IA saturée : un second essai rapide avant d'abandonner
    if (e.retryable && navigator.onLine) {
      await new Promise(r => setTimeout(r, 1500));
      return post(payload, false);
    }
    throw e;
  }
}
