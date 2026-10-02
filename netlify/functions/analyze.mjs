import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getStore } from '@netlify/blobs';
import { NUTRITION_SCHEMA, buildPrompt, normalizeResult } from '../../shared/nutrition.js';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const MAX_BODY = 3_000_000; // ~2,2 Mo d'image une fois décodée, largement assez pour 768 px
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Netlify coupe une fonction gratuite à 10 s : on garde une marge pour répondre proprement
const BUDGET_MS = 9000;
const MIN_ATTEMPT_MS = 1500;
const LAST_MODEL_RESERVE_MS = 2500;
const PER_MODEL_MAX_MS = 4500;
// Un modèle qui vient de répondre « surchargé » est sauté pendant ce délai (mémoire de l'instance)
const COOLDOWN_MS = 120_000;
const cooldown = new Map();
const DEFAULT_MODELS = 'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

const intEnv = (name, fallback) => Number.parseInt(process.env[name], 10) || fallback;

async function verifyUser(req) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!projectId || !token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${projectId}`, audience: projectId });
    return payload.email_verified ? payload : null;
  } catch {
    return null;
  }
}

/** Liste blanche optionnelle : ALLOWED_EMAILS="a@x.com,b@y.com" réserve l'IA à ces comptes. */
function isAllowed(email) {
  const list = (process.env.ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return !list.length || list.includes(String(email).toLowerCase());
}

/** Limite par utilisateur (par heure et par jour) pour protéger le quota gratuit. */
async function rateLimit(uid) {
  const store = getStore({ name: 'rate-limit', consistency: 'strong' });
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const hour = now.slice(0, 13);
  const data = (await store.get(uid, { type: 'json' })) || {};
  const dayCount = data.day === day ? data.dayCount : 0;
  const hourCount = data.hour === hour ? data.hourCount : 0;
  if (hourCount >= intEnv('RATE_LIMIT_HOUR', 40) || dayCount >= intEnv('RATE_LIMIT_DAY', 200)) return false;
  await store.setJSON(uid, { day, dayCount: dayCount + 1, hour, hourCount: hourCount + 1 });
  return true;
}

async function callGemini(model, parts, key, timeoutMs) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: NUTRITION_SCHEMA }
    })
  });
  if (!res.ok) {
    const err = new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
  if (!text) throw Object.assign(new Error(`Gemini ${model} : réponse vide`), { status: 502 });
  return normalizeResult(text);
}

/** Essaie les modèles dans l'ordre sans dépasser le budget de temps de la fonction. Exporté pour les tests. */
export async function runModels(all, parts, key, started, budget = BUDGET_MS) {
  const fresh = all.filter(m => !(cooldown.get(m) > Date.now()));
  const models = fresh.length ? fresh : all.slice(-1);
  let last;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;
    const remaining = budget - (Date.now() - started);
    // Le dernier modèle (le plus rapide) a toujours sa part garantie ; les autres se partagent le reste
    const timeout = isLast ? remaining : Math.min(PER_MODEL_MAX_MS, remaining - LAST_MODEL_RESERVE_MS);
    if (timeout < MIN_ATTEMPT_MS) {
      if (isLast) break;
      continue;
    }
    try {
      return { result: { ...(await callGemini(model, parts, key, timeout)), model } };
    } catch (e) {
      last = e;
      console.error(e.name === 'TimeoutError' ? `Gemini ${model} : délai dépassé (${timeout} ms)` : e.message);
      if (e.status === 503 || e.status === 429 || e.name === 'TimeoutError') cooldown.set(model, Date.now() + COOLDOWN_MS);
      // 400 (paramètre refusé par ce modèle), 404, quota, surcharge, délai : on tente le suivant
      if (e.status && ![400, 404, 429, 500, 502, 503, 504].includes(e.status)) break;
    }
  }
  return { last };
}

export const resetCooldown = () => cooldown.clear();

export default async (req) => {
  const started = Date.now();
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('GEMINI_API_KEY manquante');
    return json(500, { error: 'Service IA indisponible' });
  }
  if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return json(413, { error: 'Image trop lourde' });

  const user = await verifyUser(req);
  if (!user) return json(401, { error: 'Session expirée, reconnecte-toi.' });
  if (!isAllowed(user.email)) return json(403, { error: 'Analyse IA non disponible pour ce compte.' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Requête invalide' }); }
  const { image, mimeType = 'image/jpeg', name = '', weight = '', ingredients = '' } = body || {};
  if (image != null && (typeof image !== 'string' || image.length > MAX_BODY || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 200)))) {
    return json(400, { error: 'Image invalide' });
  }
  if (!MIME_TYPES.includes(mimeType)) return json(400, { error: 'Format d\'image non pris en charge' });
  if (!image && !String(name).trim() && !String(ingredients).trim()) return json(400, { error: 'Ajoute une photo ou une description.' });

  try {
    if (!(await rateLimit(user.sub))) return json(429, { error: 'Trop d\'analyses pour le moment, réessaie plus tard.', retryable: false });
  } catch (e) {
    console.error('rate limit indisponible', e.message); // on n'empêche pas l'analyse si le stockage flanche
  }

  const parts = [];
  if (image) parts.push({ inline_data: { mime_type: mimeType, data: image } });
  parts.push({
    text: buildPrompt({
      name: String(name).slice(0, 200),
      weight: String(weight).replace(/[^\d]/g, '').slice(0, 5),
      ingredients: String(ingredients).slice(0, 1000),
      hasImage: !!image
    })
  });

  const models = (process.env.GEMINI_MODELS || DEFAULT_MODELS).split(',').map(s => s.trim()).filter(Boolean);
  const { result, last } = await runModels(models, parts, key, started);
  if (result) return json(200, result);
  if (last?.status === 429) return json(503, { error: 'L\'IA est très sollicitée, ton repas sera analysé un peu plus tard.', retryable: true });
  return json(503, { error: 'L\'IA est indisponible pour le moment.', retryable: true });
};

export const config = { path: '/api/analyze' };
