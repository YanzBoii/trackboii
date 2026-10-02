// Applique le thème avant le premier affichage (évite un flash clair/sombre). Fichier externe pour respecter la CSP.
try {
  var t = localStorage.getItem('tb-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#0a0f1e' : '#eef1f6';
} catch (e) { /* stockage indisponible */ }
