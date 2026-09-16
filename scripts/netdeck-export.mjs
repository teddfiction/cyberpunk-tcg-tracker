#!/usr/bin/env node
/**
 * netdeck-export.mjs — extrait la base Cyberpunk TCG depuis api.netdeck.gg
 * et produit un cards_enriched.json importable dans l'app.
 *
 *   node netdeck-export.mjs              # métadonnées (rapide)
 *   node netdeck-export.mjs --images     # + miniatures webp base64 (npm i sharp)
 *   node netdeck-export.mjs --images --width=200   # miniatures plus legeres
 *   node netdeck-export.mjs --flat       # saute la passe détail : 1 impression par carte
 *   node netdeck-export.mjs --raw        # dump brut de la liste, sans transformation
 *
 * Node 18+. Aucune dépendance sauf sharp pour --images.
 *
 * Schéma de l'API (relevé le 15/09/2026) :
 *   { items: [ { id, external_id, name, subname, display_name, slug,
 *                printing_id, set: { code, name }, rarity, print_number,
 *                image_url (signée), source_image_url (non signée), artist,
 *                color, card_type, cost, power, ram, is_eddiable,
 *                classifications[], keywords[] (vide), rules_text,
 *                printings[], legality } ], total }
 *
 * Point important : dans la liste, `printings` est VIDE et chaque item ne porte
 * qu'une seule impression. Les autres impressions d'une même carte ne se
 * récupèrent que par la fiche détaillée — d'où la seconde passe.
 *
 * Second piège : le numéro de collecteur s'appelle `print_number` dans la liste,
 * mais `collector_number` dans les impressions du détail. `printingOf` lit les
 * deux ; n'en lire qu'un laisse 351 des 502 impressions sans numéro.
 *
 * L'API n'est pas publique (netdeck.gg/for-developers : « Coming Soon ») et ses
 * routes bougent : /api/cyberpunk renvoyait encore la liste la veille, il faut
 * désormais /api/cards/cyberpunk. Si la liste part en 404, c'est la première
 * chose à revérifier — embed.js sur netdeck.gg expose les routes courantes.
 */

import { writeFile } from "node:fs/promises"

const API = "https://api.netdeck.gg/api/cards/cyberpunk"
const ORIGIN = "https://cyberpunktcg.com"
const PAGE = 60
const DELAY = 250

const args = new Set(process.argv.slice(2))
const WANT_IMAGES = args.has("--images")
/**
 * Largeur des miniatures. Il n'existe aucune URL d'image publique — CloudFront
 * exige une signature qui expire — donc la miniature stockee ici est la seule
 * image dont disposera l'app, aussi bien pour l'icone de ligne que pour
 * l'apercu au survol. 320 px la rend lisible en apercu pour ~5 Mo de base64
 * sur 151 cartes ; 200 px suffit si l'on ne veut que l'icone.
 */
const WIDTH = Number([...args].find((a) => a.startsWith("--width="))?.slice(8)) || 320
const FLAT = args.has("--flat")
const RAW_ONLY = args.has("--raw")

const headers = { Accept: "application/json", Origin: ORIGIN, Referer: ORIGIN + "/" }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (s) => process.stderr.write(s)

async function getJSON(url) {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return res.json()
}

/* ------------------------------------------------------------------- liste */

async function fetchList() {
  const all = []
  let offset = 0
  let total = null
  for (;;) {
    const p = await getJSON(`${API}?limit=${PAGE}&offset=${offset}`)
    const items = p.items ?? p.data ?? p.results ?? (Array.isArray(p) ? p : null)
    if (!items) throw new Error("cle items absente — relance avec --raw")
    if (total === null) total = p.total ?? null
    all.push(...items)
    log(`  liste : ${all.length}${total ? "/" + total : ""}\r`)
    if (items.length < PAGE || (total && all.length >= total)) break
    offset += PAGE
    await sleep(DELAY)
  }
  log("\n")
  return all
}

/* ------------------------------------------- detail : toutes les impressions */

/**
 * On ne connait pas la route exacte : on essaie, on retient celle qui marche.
 * Relevé du 15/09/2026 : `${API}/${id}` repond 404. Les formes restent listees,
 * l'API bougeant, et le script dit en fin de passe laquelle a repondu.
 */
const DETAIL_SHAPES = [
  (c) => `${API}/${encodeURIComponent(c.slug)}`,
  (c) => `${API}?slug=${encodeURIComponent(c.slug)}`,
  (c) => `${API}/${c.id}`,
  (c) => `${API}/printings?card_id=${c.id}`,
]
let detailShape = null

async function fetchDetail(card) {
  const shapes = detailShape ? [detailShape] : DETAIL_SHAPES
  for (const shape of shapes) {
    try {
      const p = await getJSON(shape(card))
      const obj = p.item ?? p.data ?? (Array.isArray(p.items) ? p.items[0] : p)
      if (obj && (obj.printing_id || Array.isArray(obj.printings))) {
        detailShape = shape
        return obj
      }
    } catch {
      /* on essaie la forme suivante */
    }
  }
  return null
}

/* -------------------------------------------------------------- mapping */

const printingOf = (o) => ({
  uuid: o.printing_id ?? o.id ?? null,
  set: o.set?.name ?? null,
  setCode: o.set?.code ?? null,
  // Trois noms selon l'endpoint : la liste dit `print_number`, le detail dit
  // `collector_number`. Sans ce dernier, seule l'impression de tete recevait un
  // numero et les autres restaient vides — or elles en ont toutes un, distinct
  // (« 005a », « 005b », « B005a »… le prefixe marquant les tirages Beta).
  number: o.print_number ?? o.collector_number ?? o.number ?? null,
  rarity: o.rarity ?? null,
  artist: o.artist ?? null,
  image: o.image_url ?? null, // signee, a consommer tout de suite
})

const cardOf = (o) => ({
  // Cardmarket ecrit "Nom - Sous-titre" : on reproduit exactement cette forme
  name: o.subname ? `${o.name} - ${o.subname}` : o.name,
  // Le sous-titre seul sert de deuxieme ligne dans la grille
  subname: o.subname ?? null,
  slug: o.slug ?? null,
  type: o.card_type ?? null,
  color: o.color ?? null,
  cost: o.cost ?? null,
  power: o.power ?? null,
  ram: o.ram ?? null,
  // `classifications` sont les tags affiches sur la carte (Merc, Arasaka...).
  // `keywords` est vide sur les 151 cartes du relevé : on ne le garde pas.
  tags: o.classifications ?? [],
  // Carte jouable en eddies : le "€$" de la carte, et un filtre de la grille.
  eddiable: !!o.is_eddiable,
  printings: [],
})

/* ------------------------------------------------------------- miniatures */

let sharp = null
async function thumbnail(url) {
  if (!sharp) {
    try {
      ;({ default: sharp } = await import("sharp"))
    } catch {
      throw new Error("--images necessite sharp : npm i sharp")
    }
  }
  const res = await fetch(url, { headers })
  if (!res.ok) return null
  const out = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize({ width: WIDTH })
    .webp({ quality: 72 })
    .toBuffer()
  return "data:image/webp;base64," + out.toString("base64")
}

/* ------------------------------------------------------------------ main */

log("Recuperation de la liste...\n")
const list = await fetchList()
log(`${list.length} entrees. Champs : ${Object.keys(list[0] || {}).join(", ")}\n`)

if (RAW_ONLY) {
  await writeFile("netdeck-raw.json", JSON.stringify(list, null, 2))
  log("→ netdeck-raw.json\n")
  const tally = (get) => {
    const m = new Map()
    for (const it of list) { const k = get(it) ?? "—"; m.set(k, (m.get(k) ?? 0) + 1) }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(", ")
  }
  log(`   raretes : ${tally((i) => i.rarity)}\n`)
  log(`   sets    : ${tally((i) => i.set?.code)}\n`)
  const bySlug = new Map()
  for (const it of list) bySlug.set(it.slug, (bySlug.get(it.slug) ?? 0) + 1)
  const multi = [...bySlug.entries()].filter(([, n]) => n > 1)
  log(`   ${bySlug.size} slugs distincts, dont ${multi.length} presents plusieurs fois dans la liste\n`)
  process.exit(0)
}

// une entree de liste = une carte + son impression par defaut
const cards = new Map()
for (const item of list) {
  const key = item.external_id ?? item.slug ?? item.name
  if (!cards.has(key)) cards.set(key, cardOf(item))
  cards.get(key).printings.push(printingOf(item))
}

if (!FLAT) {
  log("Passe detail (toutes les impressions)...\n")
  let i = 0
  let extraCount = 0
  for (const [key, card] of cards) {
    const src = list.find((it) => (it.external_id ?? it.slug ?? it.name) === key)
    const detail = await fetchDetail(src)
    if (detail) {
      const extra =
        Array.isArray(detail.printings) && detail.printings.length ? detail.printings : [detail]
      const seen = new Set(card.printings.map((p) => p.uuid))
      for (const p of extra) {
        const np = printingOf(p)
        if (np.uuid && !seen.has(np.uuid)) {
          card.printings.push(np)
          seen.add(np.uuid)
          extraCount++
        }
      }
    }
    log(`  ${++i}/${cards.size} — ${extraCount} impressions supplementaires\r`)
    await sleep(DELAY)
  }
  log("\n")
  if (detailShape) log(`Route detail retenue : ${detailShape({ id: "<id>", slug: "<slug>" })}\n`)
  else log("Aucune route detail n'a repondu : une seule impression par carte.\n")
}

if (WANT_IMAGES) {
  log(`Miniatures a ${WIDTH} px...\n`)
  const n = [...cards.values()].reduce((s, c) => s + c.printings.length, 0)
  let i = 0
  for (const card of cards.values()) {
    for (const p of card.printings) {
      if (p.image) {
        try {
          p.thumb = await thumbnail(p.image)
        } catch (e) {
          log(`\n  ${card.name} : ${e.message}\n`)
        }
      }
      delete p.image // l'URL signee expire, on ne conserve que la miniature
      log(`  miniatures ${++i}/${n}\r`)
    }
  }
  log("\n")
} else {
  for (const card of cards.values()) for (const p of card.printings) delete p.image
}

const out = {
  version: 2,
  createdAt: new Date().toISOString(),
  source: "api.netdeck.gg/api/cyberpunk",
  cards: [...cards.values()],
}
await writeFile("cards_enriched.json", JSON.stringify(out))

const prints = out.cards.reduce((n, c) => n + c.printings.length, 0)
const withNum = out.cards.filter((c) => c.printings.some((p) => p.number)).length
const sets = new Set(out.cards.flatMap((c) => c.printings.map((p) => p.set).filter(Boolean)))
const weight = Math.round(JSON.stringify(out).length / 1024 / 1024 * 10) / 10
log(`→ cards_enriched.json : ${out.cards.length} cartes, ${prints} impressions, ${withNum} avec numero, ${weight} Mo\n`)
log(`   sets rencontres : ${[...sets].join(" | ")}\n`)
