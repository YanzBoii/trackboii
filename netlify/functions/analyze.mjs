import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NUTRITION_SCHEMA, buildPrompt, normalizeResult } from '../../shared/nutrition.js';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const MAX_IMAGE_B64 = 4_000_000;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function verifyUser(req) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!projectId || !token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: `https://securetoken.google.com/${projectId}`, audience: projectId });
    return payload.sub || null;
  } catch {
    return null;
  }
}

async function callGemini(model, parts, key) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
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
  if (!text) throw Object.assign(new Error('Réponse Gemini vide'), { status: 502 });
  return normalizeResult(text);
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: 'GEMINI_API_KEY manquante côté serveur' });
  if (!(await verifyUser(req))) return json(401, { error: 'Non connecté' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'JSON invalide' }); }
  const { image, mimeType = 'image/jpeg', name = '', weight = '', ingredients = '' } = body || {};
  if (!image && !name && !ingredients) return json(400, { error: 'Ajoute une photo ou une description.' });
  if (image && image.length > MAX_IMAGE_B64) return json(413, { error: 'Image trop lourde' });

  const parts = [];
  if (image) parts.push({ inline_data: { mime_type: mimeType, data: image } });
  parts.push({ text: buildPrompt({ name: String(name).slice(0, 200), weight: String(weight).slice(0, 10), ingredients: String(ingredients).slice(0, 1000), hasImage: !!image }) });

  const models = (process.env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.5-flash-lite').split(',').map(s => s.trim()).filter(Boolean);
  let last;
  for (const model of models) {
    try {
      return json(200, { ...(await callGemini(model, parts, key)), model });
    } catch (e) {
      last = e;
      console.error(e.message);
      // Quota, surcharge ou modèle indisponible : on tente le suivant
      if (![404, 429, 500, 502, 503].includes(e.status)) break;
    }
  }
  if (last?.status === 429) return json(429, { error: 'Quota IA gratuit atteint, réessaie dans un moment.' });
  return json(502, { error: 'L\'analyse a échoué, réessaie.' });
};

export const config = { path: '/api/analyze' };
