/**
 * Source de vérité des données : jeu embarqué, imports à chaud, enrichissement
 * Netdeck, collection, et les lignes de table qui en découlent.
 *
 * Les imports sont conservés dans IndexedDB, donc survivent au rechargement.
 * L'écriture n'a lieu **qu'après un import réussi**, jamais sur un simple
 * changement d'état : au premier rendu l'app est encore sur le jeu embarqué, et
 * une sauvegarde automatique écraserait ce qu'on est en train de relire. Codes
 * et collection, saisis à la main, s'écrivent eux à chaque changement — mais
 * jamais avant relecture.
 */
import * as React from "react"

import dataset from "@/data/dataset.json"
import { DEFAULT_CODES, EXPANSIONS } from "@/data/expansions"
import { buildCards, buildRows, countByExpansion } from "@/lib/dataset"
import { summarize, withQty } from "@/lib/collection"
import { buildEnrichIndex } from "@/lib/enrich"
import { plural } from "@/lib/format"
import { describe, mergeCatalog, parse, readJsonFile, IngestError } from "@/lib/ingest"
import { fetchCardmarket } from "@/lib/remote"
import { FORGETTABLE, KEYS, idbDelete, idbGet, idbSet } from "@/lib/store"
import type {
  CodeMap,
  Collection,
  Dataset,
  EnrichedCard,
  Price,
  PrintRow,
  Product,
} from "@/types"

const seed = dataset as unknown as Dataset

/** Ce qui est conservé entre deux sessions. */
type Stored = {
  catalog: Product[]
  prices: Record<string, Price>
  pricesAt: string
  catalogAt: string
  enriched: EnrichedCard[] | null
  savedAt: string
}

export type Notice = { tone: "ok" | "error"; message: string }

export function useDataset() {
  const [catalog, setCatalog] = React.useState<Product[]>(seed.catalog)
  const [prices, setPrices] = React.useState<Record<string, Price>>(seed.prices)
  const [pricesAt, setPricesAt] = React.useState(seed.pricesAt)
  const [catalogAt, setCatalogAt] = React.useState(seed.catalogAt)
  const [codes, setCodes] = React.useState<CodeMap>(DEFAULT_CODES)
  const [enriched, setEnriched] = React.useState<EnrichedCard[] | null>(null)
  const [collection, setCollection] = React.useState<Collection>({})
  const [notice, setNotice] = React.useState<Notice | null>(null)
  /** Date du dernier import conservé, `null` si rien n'est stocké. */
  const [storedAt, setStoredAt] = React.useState<string | null>(null)
  /** Un téléchargement est en cours : le bouton doit le montrer et se bloquer. */
  const [fetching, setFetching] = React.useState(false)

  const hydrated = React.useRef(false)
  /** L'échec d'écriture de la collection a déjà été signalé : un avis, pas un par clic. */
  const collectionWarned = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      const [stored, storedCodes, storedCollection] = await Promise.all([
        idbGet<Stored>(KEYS.data),
        idbGet<CodeMap>(KEYS.codes),
        idbGet<Collection>(KEYS.collection),
      ])
      if (!cancelled) {
        if (stored) {
          setCatalog(stored.catalog)
          setPrices(stored.prices)
          setPricesAt(stored.pricesAt)
          setCatalogAt(stored.catalogAt)
          setEnriched(stored.enriched)
          setStoredAt(stored.savedAt)
        }
        if (storedCodes) setCodes(storedCodes)
        if (storedCollection) setCollection(storedCollection)
      }
      hydrated.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Les codes se modifient à la frappe : on les suit, mais jamais avant relecture.
  React.useEffect(() => {
    if (!hydrated.current) return
    void idbSet(KEYS.codes, codes)
  }, [codes])

  // La collection est la seule donnée qu'aucun import ne rend : un échec
  // d'écriture se signale, une fois, au lieu de se taire.
  React.useEffect(() => {
    if (!hydrated.current) return
    void idbSet(KEYS.collection, collection).then((kept) => {
      if (kept) {
        collectionWarned.current = false
      } else if (!collectionWarned.current) {
        collectionWarned.current = true
        setNotice({
          tone: "error",
          message:
            "Ce navigateur refuse le stockage local : la collection sera perdue au rechargement. Exporter une sauvegarde depuis Paramètres.",
        })
      }
    })
  }, [collection])

  const setQty = React.useCallback(
    (printing: PrintRow, qty: number) => setCollection((c) => withQty(c, printing, qty)),
    []
  )

  const enrichIndex = React.useMemo(() => buildEnrichIndex(enriched, EXPANSIONS), [enriched])

  const rows = React.useMemo(
    () => buildRows({ catalog, prices, expansions: EXPANSIONS, codes, enrich: enrichIndex }),
    [catalog, prices, codes, enrichIndex]
  )
  const cards = React.useMemo(() => buildCards(rows, EXPANSIONS, codes), [rows, codes])
  const expCounts = React.useMemo(() => countByExpansion(rows), [rows])

  const importFiles = React.useCallback(
    async (files: FileList | File[] | null) => {
      const list = files ? Array.from(files) : []
      if (!list.length) return

      const messages: string[] = []
      let failed = false
      let changed = false
      // Une sauvegarde de collection ne touche pas aux données importées : elle
      // ne doit pas déclencher leur réécriture.
      let nextCollection: Collection | null = null

      // On accumule localement : les setters de React ne seraient pas lus à
      // temps pour construire ce qu'on doit écrire dans IndexedDB.
      let next: Omit<Stored, "savedAt"> = { catalog, prices, pricesAt, catalogAt, enriched }

      for (const file of list) {
        try {
          const parsed = parse(await readJsonFile(file), file.name)
          messages.push(describe(parsed, file.name, next.catalog, nextCollection ?? collection))
          if (parsed.kind === "collection") {
            nextCollection = parsed.collection
            continue
          }
          if (parsed.kind === "prices") {
            next = { ...next, prices: parsed.prices, pricesAt: parsed.pricesAt }
          } else if (parsed.kind === "catalog") {
            next = {
              ...next,
              catalog: mergeCatalog(next.catalog, parsed.products),
              catalogAt: parsed.catalogAt,
            }
          } else {
            next = { ...next, enriched: parsed.cards }
          }
          changed = true
        } catch (e) {
          failed = true
          messages.push(e instanceof IngestError ? e.message : `${file.name} : import impossible.`)
        }
      }

      if (changed) {
        setCatalog(next.catalog)
        setPrices(next.prices)
        setPricesAt(next.pricesAt)
        setCatalogAt(next.catalogAt)
        setEnriched(next.enriched)

        const savedAt = new Date().toISOString()
        const kept = await idbSet(KEYS.data, { ...next, savedAt } satisfies Stored)
        setStoredAt(kept ? savedAt : null)
        if (!kept) {
          messages.push(
            "Ce navigateur refuse le stockage local : recharger la page reviendra au jeu embarqué."
          )
        }
      }

      // Remplacée, pas fusionnée : restaurer une sauvegarde doit rendre
      // exactement ce qu'elle contient. L'effet de conservation l'écrit.
      if (nextCollection) setCollection(nextCollection)

      setNotice({ tone: failed ? "error" : "ok", message: messages.join(" ") })
    },
    [catalog, prices, pricesAt, catalogAt, enriched, collection]
  )

  /**
   * Télécharge les trois exports Cardmarket et les passe par `importFiles`.
   *
   * Aucune logique d'import n'est redupliquée ici : les fichiers récupérés
   * suivent exactement le chemin de fichiers choisis à la main, compte rendu et
   * conservation compris.
   */
  const refreshData = React.useCallback(async () => {
    setFetching(true)
    try {
      await importFiles(await fetchCardmarket())
    } catch (e) {
      setNotice({
        tone: "error",
        message: e instanceof Error ? e.message : "Téléchargement impossible.",
      })
    } finally {
      setFetching(false)
    }
  }, [importFiles])

  /** Efface les imports et les codes, et repart du jeu embarqué. La collection reste. */
  const forget = React.useCallback(async () => {
    await Promise.all(FORGETTABLE.map(idbDelete))
    setCatalog(seed.catalog)
    setPrices(seed.prices)
    setPricesAt(seed.pricesAt)
    setCatalogAt(seed.catalogAt)
    setEnriched(null)
    setCodes(DEFAULT_CODES)
    setStoredAt(null)
    setNotice({
      tone: "ok",
      message: "Données importées oubliées. Retour au jeu embarqué. La collection est conservée.",
    })
  }, [])

  /**
   * Vide la collection. Pas d'`idbDelete` : l'effet de conservation écrit la
   * collection vide comme toute autre, avis d'échec d'écriture compris. Les
   * imports et les codes ne bougent pas — c'est l'exact pendant de `forget`.
   */
  const clearCollection = React.useCallback(() => {
    const { versions, copies } = summarize(collection)
    setCollection({})
    setNotice({
      tone: "ok",
      message: `Collection supprimée : ${plural(versions, "version")}, ${plural(copies, "exemplaire")}.`,
    })
  }, [collection])

  return {
    catalog,
    rows,
    cards,
    codes,
    setCodes,
    expCounts,
    expansions: EXPANSIONS,
    enriched: enrichIndex.on,
    /** Cartes Netdeck telles qu'importées — la base de cartes s'y adosse. */
    enrichedCards: enriched,
    collection,
    setQty,
    pricesAt,
    catalogAt,
    storedAt,
    notice,
    setNotice,
    importFiles,
    refreshData,
    fetching,
    forget,
    clearCollection,
  }
}

export type DatasetApi = ReturnType<typeof useDataset>
