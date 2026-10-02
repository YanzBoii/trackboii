import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetCooldown, runModels } from './analyze.mjs';

const OK_BODY = { candidates: [{ content: { parts: [{ text: '{"name":"Œufs","weight":120,"ingredients":["œufs"],"kcal":180,"p":14,"c":1,"f":12,"confidence":90,"comment":"ok","isFood":true}' }] } }] };

/** Faux Gemini : chaque modèle répond un statut après un délai (ou attend jusqu'à l'abandon). */
function mockGemini(behaviour) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn((url, { signal }) => {
    const model = url.match(/models\/(.+):generate/)[1];
    calls.push(model);
    const { status, delay = 0 } = behaviour[model];
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve(new Response(status === 200 ? JSON.stringify(OK_BODY) : '{}', { status })), delay);
      signal.addEventListener('abort', () => { clearTimeout(t); reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' })); });
    });
  }));
  return calls;
}

describe('runModels', () => {
  beforeEach(() => { resetCooldown(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => vi.unstubAllGlobals());

  it('passe au modèle suivant quand le premier est saturé', async () => {
    const calls = mockGemini({ a: { status: 503 }, b: { status: 200 } });
    const { result } = await runModels(['a', 'b'], [], 'k', Date.now());
    expect(calls).toEqual(['a', 'b']);
    expect(result).toMatchObject({ kcal: 180, model: 'b' });
  });

  it('abandonne un modèle trop lent pour laisser du temps au suivant', async () => {
    const calls = mockGemini({ a: { status: 200, delay: 60_000 }, b: { status: 200 } });
    const started = Date.now();
    const { result } = await runModels(['a', 'b'], [], 'k', started, 4000);
    expect(calls).toEqual(['a', 'b']);
    expect(result.model).toBe('b');
    expect(Date.now() - started).toBeLessThan(4000);
  });

  it('saute pendant un moment un modèle qui vient de saturer', async () => {
    mockGemini({ a: { status: 503 }, b: { status: 200 } });
    await runModels(['a', 'b'], [], 'k', Date.now());
    const calls = mockGemini({ a: { status: 200 }, b: { status: 200 } });
    await runModels(['a', 'b'], [], 'k', Date.now());
    expect(calls).toEqual(['b']);
  });

  it('garde toujours du temps pour le dernier modèle, même si les premiers traînent', async () => {
    const calls = mockGemini({ a: { status: 200, delay: 60_000 }, b: { status: 200, delay: 60_000 }, c: { status: 200, delay: 300 } });
    const { result } = await runModels(['a', 'b', 'c'], [], 'k', Date.now(), 9000);
    expect(calls).toEqual(['a', 'b', 'c']);
    expect(result.model).toBe('c');
  }, 15_000);

  it('ne dépasse jamais le budget même si tout échoue', async () => {
    mockGemini({ a: { status: 200, delay: 60_000 }, b: { status: 200, delay: 60_000 } });
    const started = Date.now();
    const { result, last } = await runModels(['a', 'b'], [], 'k', started, 4000);
    expect(result).toBeUndefined();
    expect(last.name).toBe('TimeoutError');
    expect(Date.now() - started).toBeLessThan(4500);
  });

  it('ne réessaie pas sur une erreur définitive (clé invalide)', async () => {
    const calls = mockGemini({ a: { status: 403 }, b: { status: 200 } });
    const { result, last } = await runModels(['a', 'b'], [], 'k', Date.now());
    expect(calls).toEqual(['a']);
    expect(result).toBeUndefined();
    expect(last.status).toBe(403);
  });
});
