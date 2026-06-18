const DB_NAME = 'ClauRV_Local_DB';
const DB_VERSION = 1;
const STORE_NAME = 'panoramas';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Saves a binary image Blob to IndexedDB
 */
export async function savePanoramaBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves a binary image Blob from IndexedDB
 */
export async function getPanoramaBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes a panorama image Blob from IndexedDB
 */
export async function deletePanoramaBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Converts a panorama image URL (indexeddb:// or normal) to a loadable source URL.
 * If it is an indexeddb:// reference, it reads the blob and returns a URL.createObjectURL.
 */
export async function resolvePanoramaUrl(url: string): Promise<string> {
  if (url.startsWith('indexeddb://')) {
    const id = url.replace('indexeddb://', '');
    const blob = await getPanoramaBlob(id);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    throw new Error('No se pudo encontrar la imagen en IndexedDB.');
  }
  return url;
}
