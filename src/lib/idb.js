// Mini stockage clé/valeur dans IndexedDB (assez de place pour des photos, contrairement à localStorage).
let dbPromise;

function open() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open('trackboii', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', mode);
    const req = fn(tx.objectStore('kv'));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const idbGet = key => run('readonly', s => s.get(key));
export const idbSet = (key, value) => run('readwrite', s => s.put(value, key));
export const idbDel = key => run('readwrite', s => s.delete(key));
