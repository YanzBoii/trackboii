// Tests des règles Firestore contre l'émulateur : npm run test:rules (Java 21 requis)
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import sharp from 'sharp';

let env;
let thumb;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-trackboii',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 }
  });
  // Miniature réaliste : 320 px JPEG comme celles produites par l'app
  const noise = Buffer.alloc(320 * 240 * 3).map(() => Math.floor(Math.random() * 256));
  const jpeg = await sharp(noise, { raw: { width: 320, height: 240, channels: 3 } }).jpeg({ quality: 70 }).toBuffer();
  thumb = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
});
afterAll(() => env?.cleanup());
beforeEach(() => env.clearFirestore());

const me = () => env.authenticatedContext('alice', { email: 'a@x.fr', email_verified: true }).firestore();
const unverified = () => env.authenticatedContext('alice', { email: 'a@x.fr', email_verified: false }).firestore();
const other = () => env.authenticatedContext('bob', { email: 'b@x.fr', email_verified: true }).firestore();

const profile = {
  name: 'Alice', sex: 'f', age: 28, height: 168, weight: 61.5, goal: 'perte', activity: 'modere', pace: 'reco',
  targets: { kcal: 1850, p: 123, c: 190, f: 58 }, onboarded: true
};
const meal = () => ({
  date: '2026-10-02', moment: 'dej', name: 'Bowl poulet', kcal: 640, p: 42, c: 68, f: 22, weight: 420,
  ingredients: ['poulet', 'riz'], thumb, source: 'IA', createdAt: serverTimestamp()
});

describe('accès', () => {
  it('le propriétaire vérifié lit et écrit ses données', async () => {
    await assertSucceeds(setDoc(doc(me(), 'users/alice'), profile));
    await assertSucceeds(getDoc(doc(me(), 'users/alice')));
  });
  it('email non vérifié : refusé', async () => {
    await assertFails(setDoc(doc(unverified(), 'users/alice'), profile));
  });
  it('un autre compte ne lit ni n\'écrit rien', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'users/alice/meals/m1'), meal()));
    await assertFails(getDoc(doc(other(), 'users/alice')));
    await assertFails(getDoc(doc(other(), 'users/alice/meals/m1')));
    await assertFails(setDoc(doc(other(), 'users/alice/meals/m2'), meal()));
  });
  it('non connecté : refusé', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')));
  });
});

describe('profil', () => {
  it('mise à jour partielle (prénom) acceptée', async () => {
    await assertSucceeds(setDoc(doc(me(), 'users/alice'), profile));
    await assertSucceeds(setDoc(doc(me(), 'users/alice'), { name: 'Ali' }, { merge: true }));
  });
  it('champ inconnu ou valeur hors liste : refusé', async () => {
    await assertFails(setDoc(doc(me(), 'users/alice'), { ...profile, admin: true }));
    await assertFails(setDoc(doc(me(), 'users/alice'), { ...profile, goal: 'hacker' }));
    await assertFails(setDoc(doc(me(), 'users/alice'), { ...profile, targets: { kcal: -5, p: 1, c: 1, f: 1 } }));
  });
});

describe('repas', () => {
  it('repas IA avec miniature accepté', async () => {
    await assertSucceeds(setDoc(doc(me(), 'users/alice/meals/m1'), meal()));
  });
  it('repas sans photo et sans poids accepté', async () => {
    const { thumb: _t, weight: _w, ...m } = meal();
    await assertSucceeds(setDoc(doc(me(), 'users/alice/meals/m1'), { ...m, thumb: null, source: 'Manuel' }));
  });
  it('modification depuis la feuille d\'édition acceptée', async () => {
    await assertSucceeds(setDoc(doc(me(), 'users/alice/meals/m1'), meal()));
    await assertSucceeds(updateDoc(doc(me(), 'users/alice/meals/m1'), { name: 'Bowl', moment: 'din', kcal: 600, p: 40, c: 60, f: 20 }));
  });
  it('suppression acceptée', async () => {
    await assertSucceeds(setDoc(doc(me(), 'users/alice/meals/m1'), meal()));
    await assertSucceeds(deleteDoc(doc(me(), 'users/alice/meals/m1')));
  });
  it('données invalides refusées', async () => {
    const ref = doc(me(), 'users/alice/meals/m1');
    await assertFails(setDoc(ref, { ...meal(), kcal: -10 }));
    await assertFails(setDoc(ref, { ...meal(), kcal: '640' }));
    await assertFails(setDoc(ref, { ...meal(), moment: 'brunch' }));
    await assertFails(setDoc(ref, { ...meal(), date: 'hier' }));
    await assertFails(setDoc(ref, { ...meal(), name: 'x'.repeat(500) }));
    await assertFails(setDoc(ref, { ...meal(), extra: 1 }));
    await assertFails(setDoc(ref, { ...meal(), thumb: 'https://exemple.com/pub.jpg' }));
    await assertFails(setDoc(ref, { ...meal(), thumb: 'data:image/jpeg;base64,' + 'A'.repeat(200000) }));
  });
});

describe('presets et pesées', () => {
  it('preset valide accepté', async () => {
    const { date: _d, moment: _m, source: _s, ...p } = meal();
    await assertSucceeds(setDoc(doc(me(), 'users/alice/presets/p1'), { ...p, items: '420 g · poulet, riz' }));
  });
  it('pesée du jour acceptée, incohérente refusée', async () => {
    await assertSucceeds(setDoc(doc(me(), 'users/alice/weights/2026-10-02'), { date: '2026-10-02', kg: 76.9 }));
    await assertFails(setDoc(doc(me(), 'users/alice/weights/2026-10-02'), { date: '2026-10-01', kg: 76.9 }));
    await assertFails(setDoc(doc(me(), 'users/alice/weights/2026-10-02'), { date: '2026-10-02', kg: 900 }));
  });
});
