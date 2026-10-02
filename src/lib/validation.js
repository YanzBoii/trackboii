/** Au moins 8 caractères, une lettre et un chiffre. Renvoie le problème, ou null si c'est bon. */
export const passwordProblem = pw =>
  pw.length < 8 ? '8 caractères minimum' : !/\p{L}/u.test(pw) || !/\d/.test(pw) ? 'il faut au moins une lettre et un chiffre' : null;

/** Cellule CSV : guillemets échappés, et formules (=, +, -, @) neutralisées pour Excel. */
export const csvCell = s => '"' + String(s ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""') + '"';
