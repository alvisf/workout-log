const DB = 'lift-log';
export type StoreName = 'exercises' | 'programs' | 'workouts' | 'bodyweight';
const STORES: Record<StoreName, string> = { exercises: 'id', programs: 'id', workouts: 'id', bodyweight: 'date' };
let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      for (const [name, key] of Object.entries(STORES)) {
        if (!r.result.objectStoreNames.contains(name)) r.result.createObjectStore(name, { keyPath: key });
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then((db) => new Promise<T>((res, rej) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => res((req ? req.result : undefined) as T);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  }));
}

export const getAll = <T>(store: StoreName) => run<T[]>(store, 'readonly', (s) => s.getAll());
export const put = <T>(store: StoreName, v: T) => run<void>(store, 'readwrite', (s) => { s.put(v); });
export const putMany = <T>(store: StoreName, list: T[]) => run<void>(store, 'readwrite', (s) => { list.forEach((v) => s.put(v)); });
export const del = (store: StoreName, key: string) => run<void>(store, 'readwrite', (s) => { s.delete(key); });
export const clear = (store: StoreName) => run<void>(store, 'readwrite', (s) => { s.clear(); });
