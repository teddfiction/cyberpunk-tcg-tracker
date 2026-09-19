/**
 * Lignes de la base de cartes : une par impression Netdeck.
 *
 * L'entité est ici l'impression et non l'annonce Cardmarket. C'est ce qui rend
 * visibles les cartes qu'aucun vendeur ne propose — invisibles dans la table
 * des cotes — et ce qui donne rareté et numéro sans détour.
 *
 * La cote Cardmarket n'est rattachée que lorsqu'un seul produit correspond à
 * cette carte dans cette extension. Quand plusieurs se partagent le nom, rien
 * ne dit lequel est cette impression : on montre la fourchette, on ne choisit
 * pas. Même règle que la colonne Rareté de l'autre table.
 */
import { rarityLabel, rarityRank } from "@/data/rarities"
import { matchExpansion } from "@/lib/enrich"
import { eur, minOf, norm, words } from "@/lib/format"
import type { Scope } from "@/lib/collection"
import type { CodeMap, Collection, EnrichedCard, GridCard, PrintRow, Row } from "@/types"

import type { FilterFn } from "@tanstack/react-table"

type BuildArgs = {
  cards: EnrichedCard[] | null
  rows: Row[]
  expansions: Record<string, string>
  codes: CodeMap
  /** Quantités possédées. Facultative : la base se construit aussi sans. */
  collection?: Collection
}

export function buildPrintings({
  cards,
  rows,
  expansions,
  codes,
  collection = {},
}: BuildArgs): PrintRow[] {
  if (!cards?.length) return []

  // Produits Cardmarket par carte et par extension, pour rattacher les cotes.
  const byNameExp = new Map<string, Row[]>()
  for (const r of rows) {
    const key = `${norm(r.name)}|${r.exp}`
    const group = byNameExp.get(key)
    if (group) group.push(r)
    else byNameExp.set(key, [r])
  }

  const out: PrintRow[] = []
  for (const card of cards) {
    let rank = 0
    for (const printing of card.printings) {
      if (!printing.uuid) continue
      const exp = matchExpansion(printing.set, printing.setCode, expansions)
      const group = exp ? (byNameExp.get(`${norm(card.name)}|${exp}`) ?? []) : []
      const lows = group.map((r) => r.low)
      const min = minOf(lows)
      const max = lows.reduce<number | null>((m, v) => (v != null && (m == null || v > m) ? v : m), null)

      out.push({
        uuid: printing.uuid,
        name: card.name,
        slug: card.slug,
        set: printing.set ?? "Set inconnu",
        exp,
        code: exp ? (codes[exp]?.code ?? "") : "",
        num: printing.number,
        rarity: printing.rarity,
        artist: printing.artist,
        thumb: printing.thumb ?? null,
        type: card.type ?? null,
        color: card.color ?? null,
        cost: card.cost ?? null,
        power: card.power ?? null,
        ram: card.ram ?? null,
        low: group.length === 1 ? (group[0].low ?? null) : null,
        lowRange: group.length > 1 && min != null && max != null && min !== max ? [min, max] : null,
        variants: group.length,
        rank: rank++,
        qty: collection[printing.uuid]?.qty ?? 0,
      })
    }
  }

  return out.sort(
    (a, b) => a.name.localeCompare(b.name, "fr") || a.set.localeCompare(b.set, "fr")
  )
}

/**
 * Regroupe les impressions par carte, pour la grille.
 *
 * L'impression de référence est celle de rang 0 : l'endpoint liste de Netdeck
 * sert la version par défaut de la carte, et le script la pousse en tête. C'est
 * elle que la tuile montre tant qu'aucune rareté n'est filtrée.
 *
 * Pas le numéro de collecteur : les 502 impressions en portent toutes un, il ne
 * désigne donc pas la version par défaut — s'y fier ramènerait la tuile à
 * l'ordre alphabétique des sets.
 *
 * La carte ne porte pas de visuel : c'est `printingIndex` qui l'élit au rendu,
 * puisqu'il dépend des raretés filtrées — donc de l'état de la table, que la
 * donnée ne connaît pas.
 */
export function buildGrid(cards: EnrichedCard[] | null, printings: PrintRow[]): GridCard[] {
  if (!cards?.length) return []

  const byName = new Map<string, PrintRow[]>()
  for (const p of printings) {
    const group = byName.get(p.name)
    if (group) group.push(p)
    else byName.set(p.name, [p])
  }

  return cards
    .map((card) => ({
      id: card.name,
      name: card.name,
      subname: card.subname ?? null,
      slug: card.slug,
      type: card.type ?? null,
      color: card.color ?? null,
      tags: card.tags ?? [],
      eddiable: !!card.eddiable,
      cost: card.cost ?? null,
      power: card.power ?? null,
      ram: card.ram ?? null,
      ...aggregate([...(byName.get(card.name) ?? [])].sort((a, b) => a.rank - b.rank)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
}

/**
 * Ce qu'une tuile agrège de ses impressions : facettes, cote, exemplaires. Une
 * seule définition pour la carte entière, la version de la collection et la
 * carte déclinée par rareté — sans quoi l'une des trois finirait par compter
 * autrement que les autres.
 */
function aggregate(printings: PrintRow[]) {
  return {
    printings,
    sets: [...new Set(printings.map((p) => p.set))],
    rarities: [...new Set(printings.map((p) => p.rarity).filter((r): r is string => !!r))].sort(
      (a, b) => rarityRank(a) - rarityRank(b)
    ),
    low: minOf(printings.map((p) => p.low ?? p.lowRange?.[0] ?? null)),
    owned: printings.reduce((n, p) => n + p.qty, 0),
  }
}

/**
 * La tuile réduite à certaines de ses impressions, sous un autre identifiant.
 * Tout ce qui s'agrège est recalculé sur celles-là seules : c'est ce qui rend
 * les facettes exactes — filtrer « Nova Rare » ne garde pas une tuile qui n'en
 * porte que la Common, filtrer un set ne garde pas une rareté qui n'y figure pas.
 */
export const narrow = (card: GridCard, printings: PrintRow[], id: string): GridCard => ({
  ...card,
  id,
  ...aggregate(printings),
})

/**
 * Lettre d'illustration alternative d'un numéro de collecteur : « 005a » → « a »,
 * « β005b » → « b », et rien pour « 109 » ou « β169 ».
 *
 * C'est ainsi que l'éditeur code deux illustrations d'une même carte à rareté
 * égale — V - Streetkid, masculin en #005a, féminine en #005b, toutes deux
 * Rare. Le « β » de tête ne compte pas : #005a et #β005a sont la même
 * illustration, en Retail et en Beta. La lettre est gardée telle quelle, sans
 * changer sa casse : « 005a » n'est pas « 005A ».
 *
 * Seule la lettre fait foi, pas le numéro : Royce a deux Rare, #002 et #004,
 * qui ne sont qu'une réimpression dans un autre set.
 */
export const altOf = (num: string | null): string => num?.match(/\d([a-z])$/i)?.[1] ?? ""

/**
 * Les cartes à collectionner d'une carte, une tuile chacune : une par rareté, de
 * la plus commune à la plus rare, et, à rareté égale, une par illustration
 * alternative (`altOf`). Chaque tuile est réduite aux impressions qui la
 * portent.
 *
 * C'est la carte à collectionner qu'on cherche, pas l'impression : Sasha
 * Yakovleva existe en Secret (#109, #β109) et en Iconic Secret (#β169) — deux
 * cartes à réunir, dont la première s'obtient par l'une ou l'autre de ses
 * impressions. Les réimpressions restent donc sur une seule tuile, et dans sa
 * modale. Les illustrations alternatives, elles, sont deux cartes : V -
 * Streetkid en Rare donne #005a (et #β005a) d'un côté, #005b (et #β005b) de
 * l'autre.
 *
 * Une carte qui ne donne qu'une tuile est rendue telle quelle, identifiant
 * compris. Une impression sans rareté ne rejoint aucune tuile d'une carte
 * déclinée : aucune rareté cochée ne pourrait la retenir.
 */
export function collectibles(card: GridCard): GridCard[] {
  // Clé `nom|rareté`, suivie de `|lettre` pour une illustration alternative.
  // Parcouru dans l'ordre des raretés, puis des impressions : c'est la carte
  // qui ordonne ses lettres.
  const groups = new Map<string, PrintRow[]>()
  for (const rarity of card.rarities) {
    for (const p of card.printings) {
      if (p.rarity !== rarity) continue
      const alt = altOf(p.num)
      const id = `${card.id}|${rarity}` + (alt ? `|${alt}` : "")
      const group = groups.get(id)
      if (group) group.push(p)
      else groups.set(id, [p])
    }
  }
  if (groups.size < 2) return [card]
  return [...groups].map(([id, printings]) => narrow(card, printings, id))
}

/** Ce qui distingue une carte à collectionner des autres tuiles de sa carte. */
export type Collectible = {
  rarity: string
  /** Lettre d'illustration alternative, vide s'il n'y en a pas. */
  alt: string
}

/**
 * La carte à collectionner que représente une tuile, quand elle n'en
 * représente qu'une : une version de la collection, ou une carte de la base
 * déclinée parce qu'une rareté est cochée. `null` pour une carte entière de la
 * base : un badge de rareté n'y figurerait que sur les cartes d'une seule
 * rareté, et son absence sur les autres ne dirait rien.
 */
export function tileCollectible(
  card: GridCard,
  scope: Scope,
  rarities: string[]
): Collectible | null {
  const single = scope !== "all" || rarities.length > 0
  if (!single || card.rarities.length !== 1) return null
  const alts = new Set(card.printings.map((p) => altOf(p.num)))
  return { rarity: card.rarities[0], alt: alts.size === 1 ? [...alts][0] : "" }
}

/** « Rare, version a » : ce que lit un lecteur d'écran, et ce que comparent les tests. */
export const collectibleText = (c: Collectible) =>
  [rarityLabel(c.rarity), c.alt && `version ${c.alt}`].filter(Boolean).join(", ")

/**
 * Index, dans `card.printings`, de l'impression que la tuile met en avant.
 *
 * Sans filtre c'est le rang 0, la version par défaut de la carte. Filtrer sur
 * une rareté fait passer devant l'impression qui la porte : l'artwork est la
 * seule chose qui distingue deux versions d'une même carte, donc une grille
 * filtrée par rareté qui garderait le visuel par défaut ne montrerait rien de
 * ce qu'on vient de demander.
 *
 * Un index plutôt que l'impression elle-même : la modale s'ouvre sur cette
 * version-là, et son sélecteur raisonne en index.
 */
export function printingIndex(card: GridCard, rarities: string[]): number {
  // Les impressions sans miniature ne sont candidates que si aucune n'en a :
  // une tuile vide informe moins qu'un visuel, fût-il celui d'une autre
  // version. C'est le repli qu'appliquait déjà la tuile avant les filtres.
  const visuals = card.printings.filter((p) => p.thumb)
  const pool = visuals.length ? visuals : card.printings

  // La première impression cochée dans l'ordre des rangs, pas dans celui des
  // cases : c'est l'ordre de la carte qui fait foi, comme partout ailleurs.
  const hit = rarities.length
    ? pool.find((p) => p.rarity && rarities.includes(p.rarity))
    : undefined

  const chosen = hit ?? pool[0]
  return chosen ? card.printings.indexOf(chosen) : 0
}

/**
 * Carte dont la tuile reprend le focus quand la modale se ferme, dans la
 * séquence qu'elle parcourait : celle qu'on quitte, à défaut la plus proche qui
 * la suit — qui a pris sa place dans la grille —, puis la plus proche qui la
 * précède.
 *
 * La carte quittée n'a pas toujours encore sa tuile : l'ajouter depuis un filtre
 * « Manquante », ou retirer une version de la collection, la fait sortir de la
 * grille. Sans repli, le focus retomberait sur `body` et le clavier repartirait
 * du haut des 151 tuiles.
 */
export function focusTarget(
  cards: { id: string }[],
  at: number,
  hasTile: (id: string) => boolean
): string | undefined {
  const after = cards.slice(at).find((c) => hasTile(c.id))
  const before = cards
    .slice(0, at)
    .reverse()
    .find((c) => hasTile(c.id))
  return (after ?? before)?.id
}

/**
 * Une information de carte : un libellé terne, une valeur contrastée.
 * `dot` marque celle qui porte la pastille de couleur.
 */
export type CardStat = { label: string; value?: string; dot?: boolean }

/**
 * Caractéristiques d'une carte. La tuile et la modale des versions les montrent
 * toutes deux, par `StatLine` (`components/card-info.tsx`) — d'où leur place ici
 * plutôt que dans l'un des deux composants.
 *
 * La pastille de couleur s'accroche à la RAM, comme sur le site officiel. Une
 * carte sur 151 n'a pas de RAM : sa pastille passe alors en tête, faute de quoi
 * sa couleur ne s'afficherait nulle part.
 */
export function cardStats(card: GridCard): CardStat[] {
  const out: CardStat[] = []
  if (card.cost != null) out.push({ label: "Coût", value: String(card.cost) })
  if (card.power != null) out.push({ label: "Force", value: String(card.power) })
  if (card.ram != null) out.push({ label: "RAM", value: String(card.ram) })
  if (card.eddiable) out.push({ label: "€$" })

  // La pastille n'existe que s'il y a une couleur à montrer. Elle se pose sur
  // la RAM ; à défaut sur la première info, et à défaut sur une info dédiée.
  if (card.color) {
    const porteur = out.find((s) => s.label === "RAM") ?? out[0]
    if (porteur) porteur.dot = true
    else out.push({ label: card.color, dot: true })
  }
  return out
}

/**
 * Ce que porte la tuile : les caractéristiques, plus la cote Cardmarket. La
 * modale ne la reprend pas — elle en montre une par version.
 */
export const tileStats = (card: GridCard): CardStat[] =>
  card.low != null
    ? [...cardStats(card), { label: "Cardmarket dès", value: eur(card.low) ?? "" }]
    : cardStats(card)

/** Rendu texte d'une information : ce que les tests comparent, sans passer par le DOM. */
export const statText = (s: CardStat) => [s.label, s.value].filter(Boolean).join(" ")

/** Recherche de la grille : nom, sous-titre, tags, type, couleur, sets, raretés. */
export const searchCard: FilterFn<GridCard> = (row, _columnId, needle) => {
  const terms = words(String(needle))
  if (!terms.length) return true
  const c = row.original
  const hay =
    " " +
    words(
      [c.name, c.subname, c.type, c.color, ...c.tags, ...c.sets, ...c.rarities]
        .filter(Boolean)
        .join(" ")
    ).join(" ")
  return terms.every((term) => hay.includes(" " + term))
}
