// Génère les icônes de l'app (npm run icons).
// - public/icon.svg (coins arrondis) : icônes affichées telles quelles (PC, onglet, favicon)
// - assets/icon-square.svg (carrée) : iOS et Android appliquent eux-mêmes leur arrondi
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const rounded = await readFile('public/icon.svg');
const square = await readFile('assets/icon-square.svg');

const png = (svg, size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

const outputs = [
  ['public/pwa-64x64.png', rounded, 64],
  ['public/pwa-192x192.png', rounded, 192],
  ['public/pwa-512x512.png', rounded, 512],
  ['public/maskable-icon-512x512.png', square, 512],
  ['public/apple-touch-icon-180x180.png', square, 180]
];
for (const [file, svg, size] of outputs) {
  await writeFile(file, await png(svg, size));
  console.log('✓', file);
}

// favicon.ico : un conteneur ICO avec une image PNG 48×48 embarquée
const fav = await png(rounded, 48);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // réservé
header.writeUInt16LE(1, 2); // type : icône
header.writeUInt16LE(1, 4); // nombre d'images
header.writeUInt8(48, 6); // largeur
header.writeUInt8(48, 7); // hauteur
header.writeUInt16LE(1, 10); // plans de couleur
header.writeUInt16LE(32, 12); // bits par pixel
header.writeUInt32LE(fav.length, 14); // taille des données
header.writeUInt32LE(22, 18); // position des données
await writeFile('public/favicon.ico', Buffer.concat([header, fav]));
console.log('✓ public/favicon.ico');
