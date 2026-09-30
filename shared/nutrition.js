// Logique partagée entre la Netlify Function et le front (et testée par Vitest).

export const NUTRITION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: 'Nom court du plat, en français' },
    weight: { type: 'NUMBER', description: 'Poids total estimé en grammes' },
    ingredients: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Ingrédients principaux, en français, avec quantité estimée si possible' },
    kcal: { type: 'NUMBER' },
    p: { type: 'NUMBER', description: 'Protéines en grammes' },
    c: { type: 'NUMBER', description: 'Glucides en grammes' },
    f: { type: 'NUMBER', description: 'Lipides en grammes' },
    confidence: { type: 'NUMBER', description: 'Confiance de 0 à 100' },
    comment: { type: 'STRING', description: 'Une ou deux phrases de conseil bienveillant, tutoiement, en français' },
    isFood: { type: 'BOOLEAN', description: 'false si l\'image ne montre pas de nourriture' }
  },
  required: ['name', 'weight', 'ingredients', 'kcal', 'p', 'c', 'f', 'confidence', 'comment', 'isFood']
};

export function buildPrompt({ name, weight, ingredients, hasImage }) {
  const lines = [
    'Tu es un nutritionniste expert. Estime la valeur nutritionnelle du repas décrit' + (hasImage ? ' sur la photo.' : '.'),
    'Méthode : identifie chaque aliment, estime sa portion en grammes, puis additionne les calories et macros (tables type CIQUAL/USDA).',
    'Tiens compte des matières grasses de cuisson et des sauces visibles.',
    'Les informations fournies par l\'utilisateur sont prioritaires sur ton estimation visuelle.'
  ];
  if (name) lines.push(`Nom du plat donné par l'utilisateur : ${name}`);
  if (weight) lines.push(`Poids total indiqué par l'utilisateur : ${weight} g (utilise exactement ce poids).`);
  if (ingredients) lines.push(`Ingrédients indiqués par l'utilisateur : ${ingredients}`);
  lines.push('Vérifie la cohérence : kcal ≈ 4×protéines + 4×glucides + 9×lipides.');
  lines.push('Réponds uniquement avec le JSON demandé, valeurs numériques arrondies à l\'unité.');
  return lines.join('\n');
}

const num = (v, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

export function normalizeResult(raw) {
  const r = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
  return {
    name: String(r.name || 'Repas').slice(0, 80),
    weight: num(r.weight, 5000),
    ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String).filter(Boolean).slice(0, 20) : [],
    kcal: num(r.kcal, 10000),
    p: num(r.p, 1000),
    c: num(r.c, 1000),
    f: num(r.f, 1000),
    confidence: num(r.confidence, 100),
    comment: String(r.comment || ''),
    isFood: r.isFood !== false
  };
}
