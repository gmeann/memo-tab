const DB_NAME = "memo-tab-web";
const STORE_NAME = "app";
const STATE_KEY = "state";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

export async function loadWebState<T>(fallback: T): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => { db.close(); resolve((request.result as T | undefined) ?? fallback); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error("IndexedDB read failed")); };
  });
}

export async function saveWebState<T>(state: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("IndexedDB write failed")); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("IndexedDB write aborted")); };
  });
}
