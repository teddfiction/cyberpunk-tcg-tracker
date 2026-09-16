/**
 * Base de cartes : une ligne par impression, et la cote Cardmarket rattachée
 * seulement quand elle est attribuable.
 */
import { describe, expect, it } from "vitest"

import { GRID_COLUMNS } from "@/components/grid-columns"
import { buildRows } from "@/lib/dataset"
import { FACETS, facetOptions, matchOptions } from "@/lib/facets"
import { emptyIndex } from "@/lib/enrich"
import {
  buildGrid,
  buildPrintings,
  cardStats,
  focusTarget,
  printingIndex,
  statText,
  tileStats,
} from "@/lib/printings"
import { COLOR_RANK, SORT_IDS, SORTS, TYPE_RANK, sortIdOf } from "@/lib/sorts"
import { gridNames, makeGrid } from "@/test/table"
import {
  AMBIGUOUS_CATALOG,
  AMBIGUOUS_ENRICHED,
  CATALOG,
  CODES,
  ENRICHED,
  EXPANSIONS,
  PRICES,
} from "@/test/fixtures"
import type { EnrichedCard, Product } from "@/types"

const build = (catalog: Product[], cards: EnrichedCard[]) =>
  buildPrintings({
    cards,
    rows: buildRows({
      catalog,
      prices: PRICES,
      expansions: EXPANSIONS,
      codes: CODES,
      enrich: emptyIndex(),
    }),
    expansions: EXPANSIONS,
    codes: CODES,
  })

describe("buildPrintings", () => {
  const printings = build(CATALOG, ENRICHED)
  const byUuid = (uuid: string) => printings.find((p) => p.uuid === uuid)!

  it("rend une ligne par impression, pas par produit", () => {
    expect(printings).toHaveLength(3)
    expect(printings.map((p) => p.uuid).sort()).toEqual(["u1", "u2", "u3"])
  })

  it("porte la rareté et le numéro de son impression, sans ambiguïté", () => {
    expect(byUuid("u1").rarity).toBe("Nova Rare")
    expect(byUuid("u2").rarity).toBe("Common")
    expect(byUuid("u1").num).toBe("001")
  })

  it("garde le nom de set officiel, même hors Cardmarket", () => {
    expect(byUuid("u2").set).toBe("Welcome to Night City — Retail")
    expect(byUuid("u2").exp).toBe("3")
  })

  it("rattache la cote quand un seul produit correspond", () => {
    expect(byUuid("u1").low).toBe(8)
    expect(byUuid("u2").low).toBe(15)
    expect(byUuid("u1").lowRange).toBeNull()
    expect(byUuid("u1").variants).toBe(1)
  })

  it("laisse la cote vide quand le produit correspondant n'en a pas", () => {
    expect(byUuid("u3").low).toBeNull()
    expect(byUuid("u3").lowRange).toBeNull()
  })

  it("trie par nom puis par set", () => {
    expect(printings.map((p) => p.name)).toEqual([
      "Éclair - Vif",
      "Zébu - Calme",
      "Zébu - Calme",
    ])
  })

  it("rend une liste vide sans enrichissement", () => {
    expect(buildPrintings({ cards: null, rows: [], expansions: EXPANSIONS, codes: CODES })).toEqual(
      []
    )
  })
})

describe("cote non attribuable", () => {
  const printings = build(AMBIGUOUS_CATALOG, AMBIGUOUS_ENRICHED)
  const byUuid = (uuid: string) => printings.find((p) => p.uuid === uuid)!

  it("montre la fourchette plutôt que d'élire un produit", () => {
    // Deux produits Cardmarket à 5 € et 30 € pour deux impressions : rien ne
    // dit laquelle est laquelle.
    expect(byUuid("d1").low).toBeNull()
    expect(byUuid("d1").lowRange).toEqual([5, 30])
    expect(byUuid("d1").variants).toBe(2)
  })

  it("s'applique aussi à une impression unique face à plusieurs produits", () => {
    expect(byUuid("j1").lowRange).toEqual([7, 9])
  })

  it("reste exacte quand un seul produit correspond", () => {
    expect(byUuid("u9").low).toBe(12)
    expect(byUuid("u9").lowRange).toBeNull()
  })
})

describe("buildGrid", () => {
  const cards = buildGrid(ENRICHED, build(CATALOG, ENRICHED))
  const byName = (name: string) => cards.find((c) => c.name === name)!

  it("rend une tuile par carte, pas par impression", () => {
    expect(cards).toHaveLength(2)
    expect(byName("Zébu - Calme").printings).toHaveLength(2)
  })

  it("agrège les facettes de ses impressions", () => {
    const zebu = byName("Zébu - Calme")
    expect(zebu.sets.sort()).toEqual(["Alpha Kit", "Welcome to Night City — Retail"])
    // Triées de la plus commune à la plus rare, pas alphabétiquement.
    expect(zebu.rarities).toEqual(["Common", "Nova Rare"])
  })

  it("met en tête l'impression par défaut de la carte, pas la première venue", () => {
    // Rang 0 = l'impression que sert l'endpoint liste de Netdeck, poussée en
    // tête par le script. Le critère ne peut plus être « celle qui porte un
    // numéro » : depuis que l'export lit `collector_number`, elles en ont
    // toutes un. Ici « Alpha Kit » passe avant « Welcome… » bien que le tri à
    // plat de buildPrintings range les sets dans l'autre sens.
    const zebu = byName("Zébu - Calme")
    expect(zebu.printings.map((p) => p.rank)).toEqual([0, 1])
    expect(zebu.printings[0].num).toBe("001")
    expect(zebu.printings[0].set).toBe("Alpha Kit")
    expect(zebu.printings[1].num).toBe("β001")
  })

  it("retient la cote la plus basse toutes impressions confondues", () => {
    expect(byName("Zébu - Calme").low).toBe(8)
  })

  it("rend une liste vide sans enrichissement", () => {
    expect(buildGrid(null, [])).toEqual([])
  })
})

describe("printingIndex", () => {
  const cards = buildGrid(ENRICHED, build(CATALOG, ENRICHED))
  const byName = (name: string) => cards.find((c) => c.name === name)!
  const zebu = byName("Zébu - Calme")

  it("montre la version par défaut de la carte tant qu'aucune rareté n'est cochée", () => {
    expect(printingIndex(zebu, [])).toBe(0)
    expect(zebu.printings[0].set).toBe("Alpha Kit")
  })

  it("met en avant l'impression de la rareté filtrée", () => {
    // Cocher « Common » doit montrer l'artwork Common et non celui du rang 0 :
    // l'illustration est la seule chose qui distingue deux versions.
    expect(printingIndex(zebu, ["Common"])).toBe(1)
    expect(zebu.printings[1].rarity).toBe("Common")
  })

  it("suit l'ordre des impressions, pas celui des cases cochées", () => {
    // Deux raretés cochées : c'est la carte qui décide laquelle passe devant.
    expect(printingIndex(zebu, ["Common", "Nova Rare"])).toBe(0)
    expect(zebu.printings[0].rarity).toBe("Nova Rare")
  })

  it("retombe sur la version par défaut quand la carte ne porte pas la rareté", () => {
    // Le cas d'une carte retenue par une autre option de la même sélection.
    expect(printingIndex(zebu, ["Epic"])).toBe(0)
  })

  it("écarte les impressions sans miniature, plutôt que de vider la tuile", () => {
    const double = buildGrid(
      AMBIGUOUS_ENRICHED,
      build(AMBIGUOUS_CATALOG, AMBIGUOUS_ENRICHED)
    ).find((c) => c.name === "Double - Face")!

    // d1 est le rang 0 mais n'a pas de visuel : c'est d2 que la tuile montre,
    // sans filtre comme avec un filtre qui désigne d1.
    expect(printingIndex(double, [])).toBe(1)
    expect(printingIndex(double, ["Rare"])).toBe(1)
  })

  it("garde le rang 0 quand aucune impression n'a de miniature", () => {
    expect(printingIndex(byName("Éclair - Vif"), [])).toBe(0)
    expect(printingIndex(byName("Éclair - Vif"), ["Epic"])).toBe(0)
  })
})

describe("focusTarget", () => {
  const seq = ["a", "b", "c", "d"].map((id) => ({ id }))
  const mounted = (...ids: string[]) => (id: string) => ids.includes(id)

  it("rend le focus à la tuile de la carte quittée", () => {
    expect(focusTarget(seq, 1, mounted("a", "b", "c", "d"))).toBe("b")
  })

  it("passe à la suivante quand la carte quittée est sortie de la grille", () => {
    // Ajoutée depuis « Manquante » : la tuile suivante a pris sa place. Et pas
    // seulement la voisine immédiate, si elle aussi est sortie entre-temps.
    expect(focusTarget(seq, 1, mounted("a", "c", "d"))).toBe("c")
    expect(focusTarget(seq, 1, mounted("a", "d"))).toBe("d")
  })

  it("remonte à la plus proche des précédentes en bout de séquence", () => {
    expect(focusTarget(seq, 3, mounted("a", "b"))).toBe("b")
  })

  it("ne rend rien quand plus aucune tuile ne reste", () => {
    // La collection vidée sous la modale ouverte.
    expect(focusTarget(seq, 2, mounted())).toBeUndefined()
  })
})

describe("cardStats", () => {
  const make = (over: Partial<Parameters<typeof buildGrid>[0] extends (infer C)[] | null ? C : never>) =>
    buildGrid(
      [{ name: "Stat - Test", slug: null, cost: 3, power: 0, ram: 2, printings: [], ...over }],
      []
    )[0]

  it("garde les caractéristiques renseignées, y compris un zéro", () => {
    // Une force de 0 est une valeur, pas une absence : c'est `!= null` qui
    // tranche, jamais la véracité.
    expect(cardStats(make({ ram: null, eddiable: true })).map(statText)).toEqual([
      "Coût 3",
      "Force 0",
      "€$",
    ])
  })

  it("accroche la pastille de couleur à la RAM", () => {
    const stats = cardStats(make({ color: "Red" }))
    expect(stats.find((s) => s.dot)?.label).toBe("RAM")
  })

  it("replie la pastille sur la première info quand la carte n'a pas de RAM", () => {
    // Une carte sur 151 est dans ce cas : sans ce repli, sa couleur ne
    // s'afficherait nulle part.
    const stats = cardStats(make({ ram: null, color: "Blue" }))
    expect(stats.find((s) => s.dot)?.label).toBe("Coût")
  })

  it("n'invente pas de pastille pour une carte sans couleur", () => {
    expect(cardStats(make({ color: null })).some((s) => s.dot)).toBe(false)
    expect(cardStats(make({ color: null, ram: null })).some((s) => s.dot)).toBe(false)
  })

  it("la tuile ajoute la cote Cardmarket, la modale non", () => {
    const card = make({ color: "Green" })
    expect(tileStats(card).map(statText)).toEqual(cardStats(card).map(statText))
    const cote = { ...card, low: 0.45 }
    expect(tileStats(cote).map(statText).at(-1)).toMatch(/^Cardmarket dès 0,45/)
    expect(cardStats(cote).map(statText).at(-1)).not.toMatch(/Cardmarket/)
  })
})

describe("facettes", () => {
  const cards = buildGrid(ENRICHED, build(CATALOG, ENRICHED))

  it("compte les options de chaque facette", () => {
    const rarete = FACETS.find((f) => f.id === "rarities")!
    expect(facetOptions(rarete, cards)).toEqual([
      { value: "Common", count: 1 },
      { value: "Epic", count: 1 },
      { value: "Nova Rare", count: 1 },
    ])
  })

  it("garde une valeur cochée absente des cartes, pour pouvoir la décocher", () => {
    // Un filtre posé dans « Collectées » et que « Manquantes » ne porte pas.
    const rarete = FACETS.find((f) => f.id === "rarities")!
    expect(facetOptions(rarete, cards, ["Secret", "Epic"])).toEqual([
      { value: "Common", count: 1 },
      { value: "Epic", count: 1 },
      { value: "Nova Rare", count: 1 },
      { value: "Secret", count: 0 },
    ])
    const couleur = FACETS.find((f) => f.id === "color")!
    expect(facetOptions(couleur, [], ["Red"])).toEqual([{ value: "Red", count: 0 }])
  })

  it("range les raretés par rang et les nombres numériquement", () => {
    const rarete = FACETS.find((f) => f.id === "rarities")!
    expect(facetOptions(rarete, cards).map((o) => o.value)).toEqual([
      "Common",
      "Epic",
      "Nova Rare",
    ])
    const cout = FACETS.find((f) => f.id === "cost")!
    expect(facetOptions(cout, cards)).toEqual([])
  })

  it("couvre les dix filtres demandés", () => {
    expect(FACETS.map((f) => f.id)).toEqual([
      "color",
      "type",
      "tags",
      "cost",
      "power",
      "ram",
      "eddiable",
      "sets",
      "rarities",
      "owned",
    ])
  })

  it("chaque facette a sa colonne, sinon son filtre ne s'appliquerait à rien", () => {
    const ids = new Set(GRID_COLUMNS.map((c) => c.id))
    for (const facet of FACETS) expect(ids).toContain(facet.id)
  })
})

describe("tri de la grille", () => {
  it("range les couleurs et les types par rang, pas par alphabet", () => {
    // Relevé sur l'ordre de service de l'API Netdeck, qui est celui du site.
    expect(COLOR_RANK).toEqual(["Red", "Yellow", "Green", "Blue"])
    expect(TYPE_RANK).toEqual(["Legend", "Unit", "Gear", "Program"])
    expect(COLOR_RANK.indexOf("Yellow")).toBeLessThan(COLOR_RANK.indexOf("Green"))
    expect(TYPE_RANK.indexOf("Legend")).toBeLessThan(TYPE_RANK.indexOf("Gear"))
  })

  it("le tri par défaut enchaîne couleur, type, coût puis nom", () => {
    expect(SORTS.default.sorting.map((s) => s.id)).toEqual(["color", "type", "cost", "name"])
    expect(SORTS.default.sorting.every((s) => !s.desc)).toBe(true)
  })

  it("chaque tri se termine par le nom, qui départage les ex æquo", () => {
    for (const id of SORT_IDS) {
      expect(SORTS[id].sorting.at(-1)).toEqual({ id: "name", desc: false })
    }
  })

  it("ne trie qu'en ascendant les colonnes à valeurs manquantes", () => {
    // `sortUndefined: 1` range les cartes sans valeur en fin de tri ascendant
    // seulement : en descendant, elles passeraient en tête. Et `"last"`, qui
    // tient dans les deux sens, ne départage pas deux valeurs manquantes.
    const withMissing = GRID_COLUMNS.filter((c) => c.sortUndefined !== undefined)
    for (const c of withMissing) expect(c.sortUndefined).toBe(1)

    const ids = new Set(withMissing.map((c) => c.id))
    for (const id of SORT_IDS) {
      for (const s of SORTS[id].sorting) if (ids.has(s.id)) expect(s.desc).toBe(false)
    }
  })

  it("chaque tri vise une colonne qui existe", () => {
    const ids = new Set(GRID_COLUMNS.map((c) => c.id))
    for (const id of SORT_IDS) {
      for (const s of SORTS[id].sorting) expect(ids).toContain(s.id)
    }
  })

  it("retrouve le tri actif depuis l'état TanStack, sans copie React", () => {
    expect(sortIdOf([...SORTS.default.sorting])).toBe("default")
    expect(sortIdOf([...SORTS.power.sorting])).toBe("power")
    // Un tri qui ne vient pas du menu retombe sur « Défaut ».
    expect(sortIdOf([{ id: "low", desc: true }])).toBe("default")
  })

  it("applique le rang des couleurs, pas l'alphabet ni l'ordre des noms", () => {
    // Zébu est Red (rang 0), Éclair est Blue (rang 3). Par nom ou par ordre
    // alphabétique de couleur, Éclair passerait devant : ici il passe après.
    expect(gridNames(makeGrid({ sorting: [...SORTS.default.sorting] }))).toEqual([
      "Zébu - Calme",
      "Éclair - Vif",
    ])
    expect(gridNames(makeGrid({ sorting: [...SORTS.name.sorting] }))).toEqual([
      "Éclair - Vif",
      "Zébu - Calme",
    ])
  })

  it("départage les ex æquo par nom, cartes sans coût comprises", () => {
    // Relevé sur la base réelle : cinq Legend jaunes sans coût, après Rogue
    // Amendiares (7). Deux cartes de coût 2 couvrent l'ex æquo sur une valeur.
    // La grille est passée à rebours : l'ordre d'origine des lignes ne doit pas
    // faire le travail du nom.
    const legend = (name: string, cost: number | null): EnrichedCard => ({
      name,
      slug: null,
      color: "Yellow",
      type: "Legend",
      cost,
      printings: [],
    })
    const grid = buildGrid(
      [
        legend("Viktor Vektor - Sit Down and Relax", null),
        legend("Rogue Amendiares - Preem Solo", 7),
        legend("Muamar Reyes - El Capitán", null),
        legend("Zed - Deux", 2),
        legend("Dum Dum - Maelstrom Triggerman", null),
        legend("River Ward - Detective on the Hunt", null),
        legend("Abe - Deux", 2),
        legend("Kerry Eurodyne - Axe, Attitude, Audience", null),
      ],
      []
    ).reverse()

    const expected = [
      "Abe - Deux",
      "Zed - Deux",
      "Rogue Amendiares - Preem Solo",
      "Dum Dum - Maelstrom Triggerman",
      "Kerry Eurodyne - Axe, Attitude, Audience",
      "Muamar Reyes - El Capitán",
      "River Ward - Detective on the Hunt",
      "Viktor Vektor - Sit Down and Relax",
    ]
    expect(gridNames(makeGrid({ sorting: [...SORTS.default.sorting] }, grid))).toEqual(expected)
    expect(gridNames(makeGrid({ sorting: [...SORTS.cost.sorting] }, grid))).toEqual(expected)
  })

  it("trie par numéro de collecteur, celui de l'impression numérotée", () => {
    expect(gridNames(makeGrid({ sorting: [...SORTS.num.sorting] }))).toEqual([
      "Zébu - Calme", // 001
      "Éclair - Vif", // 007
    ])
  })
})

describe("matchOptions", () => {
  const options = [
    { value: "Welcome to Night City — Beta", count: 3 },
    { value: "Alpha Kit", count: 2 },
    { value: "Nova Rare", count: 1 },
  ]

  it("rend tout sur une requête vide", () => {
    expect(matchOptions(options, "  ")).toHaveLength(3)
  })

  it("apparie un début de mot, accents et casse ignorés", () => {
    expect(matchOptions(options, "night").map((o) => o.value)).toEqual([
      "Welcome to Night City — Beta",
    ])
    expect(matchOptions(options, "rare").map((o) => o.value)).toEqual(["Nova Rare"])
  })

  it("n'apparie pas un fragment pris au milieu d'un mot — même contrat que la recherche", () => {
    expect(matchOptions(options, "eta")).toEqual([])
  })
})
