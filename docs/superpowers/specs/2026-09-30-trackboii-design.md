# TrackBoii — design technique

## But
PWA de suivi calorique : photo du plat (+ nom / poids / ingrédients optionnels) → estimation IA des kcal et macros (P/G/L). Suivi du jour, presets de repas récurrents, stats (semaine / mois, poids), historique, objectifs calculés via un questionnaire d'onboarding. Comptes utilisateurs (2 personnes au départ).

## Stack
- React 18 + Vite + vite-plugin-pwa, react-router (BrowserRouter, redirect SPA Netlify).
- Firebase Auth (email/mot de passe + Google) et Firestore (cache offline persistant).
- Netlify Function `POST /api/analyze` → API Gemini (offre gratuite). Modèle(s) configurables via `GEMINI_MODELS` (liste, fallback sur 429/5xx). Défaut : `gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash-lite`.
- La fonction vérifie le Firebase ID token (JWKS Google via `jose`) : seul un utilisateur connecté consomme le quota.

## Données Firestore
- `users/{uid}` : `name, sex('h'|'f'|'x'), age, height, weight, goal('perte'|'maintien'|'muscle'), activity, pace, targets{kcal,p,c,f}, onboarded`
- `users/{uid}/meals/{id}` : `date('YYYY-MM-DD' local), moment('pdj'|'dej'|'din'|'col'), name, kcal, p, c, f, weight?, ingredients[], thumb?(dataURL ~300px), source('IA'|'Preset'|'Manuel'), createdAt`
- `users/{uid}/presets/{id}` : `name, items, kcal, p, c, f, weight?, ingredients[], thumb?`
- `users/{uid}/weights/{date}` : `date, kg`
- Règles : lecture/écriture seulement si `request.auth.uid == uid`.
- Un seul listener repas sur les 31 derniers jours (`date >= from`) alimente Aujourd'hui, Stats et Historique.

## Objectifs
Mifflin-St Jeor (h : +5, f : −161, autre : −78) × facteur d'activité (1,2 / 1,375 / 1,55 / 1,725).
Perte : −(rythme kg × 7700 / 7). Muscle : +moitié de ce montant. Plancher : 1200 kcal (f/autre), 1500 (h).
Protéines 2 g/kg (1,6 en maintien), lipides 28 % des kcal, glucides = reste. kcal arrondies à 10. Ajustables à la main dans le Profil.

## Flux d'ajout
Photo compressée côté client (1024 px pour l'IA, miniature 320 px stockée) → `/api/analyze` avec texte optionnel → JSON `{name, weight, ingredients[], kcal, p, c, f, confidence, comment}` → écran Résultat éditable → Ajouter (moment choisi) et/ou Enregistrer en preset. « Saisie manuelle » ouvre le Résultat vide sans IA. Analyse possible sans photo (texte seul).

## Écrans
Auth (connexion / inscription, même style que l'onboarding), Onboarding (bienvenue, objectif, corps, activité, rythme sauf maintien), Plan, Aujourd'hui, Ajouter, Analyse, Résultat, Presets, Stats (+ pesée), Historique (jours dépliables, suppression), Profil (objectifs éditables, thème, export CSV, déconnexion). Repas du jour : modifier / supprimer via une feuille modale.
Hors périmètre v1 : rappels de repas (push).

## Erreurs
Analyse IA en échec → retour à l'écran Ajouter avec toast + lien vers la saisie manuelle. Quota (429) → message dédié. Hors ligne : Firestore met les écritures en file d'attente, l'analyse IA est indisponible.

## Tests
Vitest sur la logique pure (calcul d'objectifs, dates, agrégats de stats, parsing de la réponse IA).
