/**
 * Base de cartes : une ligne par impression, et la cote Cardmarket rattachée
 * seulement quand elle est attribuable.
 */
import { describe, expect, it } from "vitest"

import { GRID_COLUMNS } from "@/components/grid-columns"
import { buildRows } from "@/lib/dataset"
import { FACETS, facetOptions, matchOptions } from "@/lib/facets"
import { emptyIndex } from "@/lib/enrich"
import { buildGrid, buildPrintings, cardStats } from "@/lib/printings"
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

  it("met en tête l'impression qui porte un numéro", () => {
    expect(byName("Zébu - Calme").printings[0].num).toBe("001")
  })

  it("retient la cote la plus basse toutes impressions confondues", () => {
    expect(byName("Zébu - Calme").low).toBe(8)
  })

  it("rend une liste vide sans enrichissement", () => {
    expect(buildGrid(null, [])).toEqual([])
  })
})

describe("cardStats", () => {
  const card = buildGrid(
    [
      {
        name: "Stat - Test",
        slug: null,
        cost: 3,
        power: 0,
        ram: null,
        eddiable: true,
        printings: [],
      },
    ],
    []
  )[0]

  it("garde les caractéristiques renseignées, y compris un zéro", () => {
    // Une force de 0 est une valeur, pas une absence : c'est `!= null` qui
    // tranche, jamais la véracité.
    expect(cardStats(card)).toEqual(["Coût 3", "Force 0", "€$"])
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

  it("couvre les neuf filtres demandés", () => {
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

  it("le tri par défaut enchaîne couleur, type puis coût", () => {
    expect(SORTS.default.sorting.map((s) => s.id)).toEqual(["color", "type", "cost"])
    expect(SORTS.default.sorting.every((s) => !s.desc)).toBe(true)
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
