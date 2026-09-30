const pad = n => String(n).padStart(2, '0');

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Les `count` derniers jours, du plus ancien au plus récent (aujourd'hui inclus). */
export const lastDays = (count, today = dateKey()) => Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function dayLabel(key, today = dateKey()) {
  if (key === today) return "Aujourd'hui";
  if (key === addDays(today, -1)) return 'Hier';
  return cap(parseKey(key).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
}

export const longToday = (d = new Date()) => cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

export function momentForNow(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return 'pdj';
  if (h < 15) return 'dej';
  if (h < 18) return 'col';
  return 'din';
}
