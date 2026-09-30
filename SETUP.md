# Mise en route de TrackBoii

## 1. Firebase (comptes + base de données) — ~10 min

1. Va sur <https://console.firebase.google.com> et connecte-toi avec ton compte Google.
2. **Créer un projet** → nom : `trackboii` → tu peux désactiver Google Analytics → **Créer**.
3. Sur la page d'accueil du projet, clique sur l'icône **Web `</>`** (« Ajouter une application »).
   - Surnom : `TrackBoii` — ne coche pas Firebase Hosting → **Enregistrer**.
   - Firebase affiche un bloc `const firebaseConfig = { apiKey: ..., authDomain: ..., ... }`. **Garde-le**, c'est l'étape 6.
4. Menu de gauche → **Créer (Build) → Authentication → Commencer**. Onglet **Sign-in method** :
   - active **Adresse e-mail/Mot de passe** → Enregistrer
   - active **Google** → choisis ton email comme « adresse e-mail d'assistance » → Enregistrer
5. Menu de gauche → **Créer → Firestore Database → Créer une base de données**.
   - Emplacement : `eur3 (Europe)` → mode **production** → Créer.
   - Onglet **Règles** : remplace tout par le contenu du fichier [`firestore.rules`](firestore.rules) → **Publier**.
6. À la racine du projet, copie `.env.example` en `.env` et recopie les valeurs de `firebaseConfig` :

   | firebaseConfig      | .env                                |
   |---------------------|-------------------------------------|
   | apiKey              | VITE_FIREBASE_API_KEY               |
   | authDomain          | VITE_FIREBASE_AUTH_DOMAIN           |
   | projectId           | VITE_FIREBASE_PROJECT_ID **et** FIREBASE_PROJECT_ID |
   | storageBucket       | VITE_FIREBASE_STORAGE_BUCKET        |
   | messagingSenderId   | VITE_FIREBASE_MESSAGING_SENDER_ID   |
   | appId               | VITE_FIREBASE_APP_ID                |

   > Ces valeurs Firebase ne sont pas secrètes (elles finissent dans le navigateur). La sécurité vient des règles Firestore.

## 2. Clé Gemini (IA gratuite) — ~2 min

1. Va sur <https://aistudio.google.com/apikey> → **Create API key** (choisis le projet `trackboii`).
2. Colle-la dans `.env` : `GEMINI_API_KEY=...`
   > Celle-ci est **secrète** : ne la partage pas, ne la commit pas (le `.env` est ignoré par git).
   > Offre gratuite : Google peut utiliser les photos envoyées pour améliorer ses modèles.

## 3. Lancer en local

```bash
npm install
npx netlify dev
```

Ouvre l'URL affichée (en général <http://localhost:8888>). `netlify dev` lance à la fois l'app et la fonction IA.

Pour voir l'interface sans Firebase ni IA (données fictives) : `npx vite --mode demo`.

## 4. Mettre en ligne sur Netlify

1. Pousse le projet sur GitHub (repo privé conseillé).
2. <https://app.netlify.com> → **Add new site → Import an existing project** → choisis le repo.
   Build command `npm run build`, publish directory `dist` (déjà dans `netlify.toml`).
3. **Site configuration → Environment variables** : ajoute **toutes** les variables de ton `.env`
   (les `VITE_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `GEMINI_API_KEY`). Puis **Deploys → Trigger deploy**.
4. De retour dans Firebase : **Authentication → Paramètres → Domaines autorisés → Ajouter un domaine** →
   `ton-site.netlify.app` (sinon la connexion Google sera refusée).

## 5. Installer l'app

- **iPhone** (Safari) : Partager → « Sur l'écran d'accueil ».
- **Android** (Chrome) : menu ⋮ → « Installer l'application ».
- **PC** (Chrome/Edge) : icône d'installation dans la barre d'adresse.

## Changer de modèle IA

Variable optionnelle `GEMINI_MODELS` (liste séparée par des virgules, essayée dans l'ordre si quota atteint) :
`GEMINI_MODELS=gemini-3.8-flash,gemini-3.5-flash-lite`
