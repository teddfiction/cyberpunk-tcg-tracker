/**
 * Conservation locale des imports, dans IndexedDB.
 *
 * `localStorage` plafonne vers 5 Mo et ne stocke que du texte ; l'enrichissement
 * avec miniatures en fait trois fois plus. IndexedDB encaisse, et range les
 * objets tels quels — pas de `JSON.stringify` sur 14 Mo à chaque écriture.
 *
 * Rien ne lève ici : navigation privée, quota plein ou stockage bloqué ne
 * doivent pas empêcher l'app de tourner. Mais l'échec est rendu, pas avalé —
 * l'appelant doit pouvoir prévenir que rien ne sera conservé.
 */
const DB_NAME = "cptcg"
const STORE = "imports"

/** Clés conservées. Le store garde son nom d'origine, rien ne justifie une migration. */
export const KEYS = { data: "dataset", codes: "codes", collection: "collection" } as const

/**
 * Ce que « Oublier les données conservées » efface. Pas la collection : les
 * imports se retéléchargent, une saisie à la main ne se retrouve nulle part.
 * Seul « Supprimer ma collection » l'efface, derrière une confirmation.
 */
export const FORGETTABLE = [KEYS.data, KEYS.codes]

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null)
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, 1)
    } catch {
      return resolve(null)
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

/** `ok` dit si l'opération a abouti ; `value` n'a de sens qu'en lecture. */
type Result<T> = { ok: boolean; value: T | null }

async function run<T>(
  mode: IDBTransactionMode,
  act: (store: IDBObjectStore) => IDBRequest
): Promise<Result<T>> {
  const db = await openDb()
  if (!db) return { ok: false, value: null }
  try {
    return await new Promise<Result<T>>((resolve) => {
      const request = act(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve({ ok: true, value: (request.result as T) ?? null })
      request.onerror = () => resolve({ ok: false, value: null })
      // Quota dépassé : l'erreur remonte sur la transaction, pas sur la requête.
      request.transaction?.addEventListener("abort", () => resolve({ ok: false, value: null }))
    })
  } catch {
    return { ok: false, value: null }
  } finally {
    db.close()
  }
}

export const idbGet = async <T>(key: string): Promise<T | null> =>
  (await run<T>("readonly", (s) => s.get(key))).value

export const idbSet = async (key: string, value: unknown): Promise<boolean> =>
  (await run("readwrite", (s) => s.put(value, key))).ok

export const idbDelete = async (key: string): Promise<boolean> =>
  (await run("readwrite", (s) => s.delete(key))).ok
