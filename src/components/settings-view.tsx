/**
 * Vue Paramètres : saisie des codes d'impression, sauvegarde et suppression de
 * la collection, et gestion de ce que le navigateur conserve d'une session à
 * l'autre.
 */
import * as React from "react"
import { Copy, Download, Trash2, Upload } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { dateFr, plural } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { CodeMap } from "@/types"

type Props = {
  codes: CodeMap
  setCodes: React.Dispatch<React.SetStateAction<CodeMap>>
  expansions: Record<string, string>
  counts: Record<string, number>
  onMessage: (message: string) => void
  /** Date du dernier import conservé, `null` si le navigateur n'en garde aucun. */
  storedAt: string | null
  onForget: () => void
  /** Résumé de la collection conservée. */
  collection: { versions: number; copies: number }
  onExportCollection: () => void
  /** Vide la collection. Confirmé par une boîte de dialogue avant d'arriver ici. */
  onClearCollection: () => void
  onImport: () => void
}

/**
 * Les codes d'impression n'existent dans aucun export Cardmarket : ils sont
 * saisis à la main. Toute saisie vaut confirmation et fait passer le badge en
 * plein. La saisie est conservée dans ce navigateur, mais reporter le mapping
 * dans `src/data/expansions.ts` reste ce qui le rend permanent et partagé.
 */
export function SettingsView({
  codes,
  setCodes,
  expansions,
  counts,
  onMessage,
  storedAt,
  onForget,
  collection,
  onExportCollection,
  onClearCollection,
  onImport,
}: Props) {
  const list = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
  const confirmed = list.filter((e) => codes[e]?.sure).length

  function copyMapping() {
    const out: Record<string, { code: string; name: string }> = {}
    for (const e of list) {
      if (codes[e]?.code) out[e] = { code: codes[e].code, name: expansions[e] ?? `Extension ${e}` }
    }
    const text = JSON.stringify(out, null, 2)
    navigator.clipboard?.writeText(text).then(
      () => onMessage("Mapping des codes copié dans le presse-papier."),
      () => onMessage(text)
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
      <CardHeader>
        <CardTitle>Codes d'impression</CardTitle>
        <CardDescription>
          Ces codes ne figurent dans aucun export Cardmarket. {confirmed} confirmés sur {list.length}{" "}
          extensions — les champs en pointillés sont des déductions. Une saisie vaut confirmation.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((exp) => {
            const entry = codes[exp] ?? { code: "", sure: false }
            return (
              <div key={exp} className="flex items-center gap-2">
                <Input
                  value={entry.code}
                  placeholder="—"
                  spellCheck={false}
                  aria-label={`Code pour ${expansions[exp] ?? exp}`}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase()
                    setCodes((c) => ({ ...c, [exp]: { code, sure: code.length > 0 } }))
                  }}
                  className={cn(
                    "w-28 shrink-0 font-mono text-xs tabular-nums",
                    !entry.sure && "border-dashed"
                  )}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm">{expansions[exp] ?? `Extension ${exp}`}</div>
                  <div className="text-muted-foreground text-xs tabular-nums">
                    {counts[exp]} produits
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={copyMapping}>
            <Copy />
            Copier le mapping JSON
          </Button>
          <p className="text-muted-foreground text-xs">
            Reporte le résultat dans <code>src/data/expansions.ts</code> pour le rendre permanent.
          </p>
        </div>
      </CardContent>
      </Card>

      <CollectionCard
        collection={collection}
        onExport={onExportCollection}
        onClear={onClearCollection}
        onImport={onImport}
      />

      <StoredDataCard storedAt={storedAt} onForget={onForget} />
    </div>
  )
}

/**
 * La collection est la seule donnée saisie à la main : aucun import ne la
 * reconstitue, et elle ne vit que dans ce navigateur. D'où la sauvegarde.
 */
function CollectionCard({
  collection,
  onExport,
  onClear,
  onImport,
}: {
  collection: { versions: number; copies: number }
  onExport: () => void
  onClear: () => void
  onImport: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection</CardTitle>
        <CardDescription>
          {collection.versions
            ? `${plural(collection.versions, "version")} et ${plural(collection.copies, "exemplaire")} conservés dans ce navigateur.`
            : "La collection est vide."}{" "}
          Elle ne suit ni une autre machine, ni un autre navigateur : l'exporter pour la sauvegarder.
          Importer une sauvegarde remplace intégralement la collection en cours. « Oublier les
          données conservées » n'y touche pas : seul « Supprimer ma collection » l'efface.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={!collection.versions} onClick={onExport}>
          <Download />
          Exporter la sauvegarde (JSON)
        </Button>
        <Button variant="ghost" size="sm" onClick={onImport}>
          <Upload />
          Importer une sauvegarde
        </Button>
        <ClearCollection collection={collection} onExport={onExport} onClear={onClear} />
      </CardContent>
    </Card>
  )
}

/**
 * Suppression de la collection, confirmée par une boîte de dialogue — et non en
 * deux temps dans le bouton, comme « Oublier les données conservées ». Oublier
 * se répare par un import ; ici rien ne rend la saisie, sauf une sauvegarde
 * exportée avant. Le geste doit donc s'arrêter sur ce qui sera perdu, et offrir
 * l'export sur place. Pas d'empilement à craindre : Paramètres n'est pas une
 * modale.
 */
function ClearCollection({
  collection,
  onExport,
  onClear,
}: {
  collection: { versions: number; copies: number }
  onExport: () => void
  onClear: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!collection.versions} className="sm:ml-auto">
          <Trash2 />
          Supprimer ma collection
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ma collection ?</AlertDialogTitle>
          <AlertDialogDescription>
            {plural(collection.versions, "version")} et {plural(collection.copies, "exemplaire")}{" "}
            seront effacés de ce navigateur. Aucun import ne les reconstitue : seule une sauvegarde
            exportée avant la suppression permettra de les retrouver. Les cotes, la base de cartes
            et les codes ne sont pas touchés.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {/* Hors de `AlertDialogAction` : exporter ne ferme pas la boîte, on
              peut encore supprimer ensuite — ou renoncer. */}
          <Button variant="ghost" onClick={onExport} className="sm:mr-auto">
            <Download />
            Exporter d'abord
          </Button>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onClear}>
            <Trash2 />
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Ce que le navigateur retient. Oublier est destructif mais réparable par un
 * nouvel import : une confirmation en deux temps suffit, sans boîte de dialogue.
 */
function StoredDataCard({ storedAt, onForget }: { storedAt: string | null; onForget: () => void }) {
  const [confirming, setConfirming] = React.useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Données conservées</CardTitle>
        <CardDescription>
          {storedAt
            ? `Les données des vues Cotes Cardmarket et Base de cartes — catalogue, cotes, enrichissement Netdeck — et les codes saisis sont conservés dans ce navigateur depuis le ${dateFr(storedAt)}. Recharger la page les retrouve. Les oublier ne touche pas à la collection.`
            : "Aucun import n'est conservé : l'app tourne sur le jeu de données embarqué."}{" "}
          Ce stockage est local à ce navigateur — il ne suit ni le dépôt, ni une autre machine.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button
          variant={confirming ? "destructive" : "outline"}
          size="sm"
          disabled={!storedAt}
          onClick={() => {
            if (!confirming) return setConfirming(true)
            setConfirming(false)
            onForget()
          }}
          onBlur={() => setConfirming(false)}
        >
          <Trash2 />
          {confirming ? "Confirmer l'oubli" : "Oublier les données conservées"}
        </Button>
      </CardContent>
    </Card>
  )
}
