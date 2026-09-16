/**
 * Modale d'import : ce que chaque fichier fait des données en place, puis une
 * zone de dépôt et le sélecteur de fichiers.
 *
 * Elle existe parce que l'import est reconnu au contenu et non au nom : sans
 * cette liste, rien ne disait qu'une sauvegarde de collection remplace
 * intégralement celle en cours.
 */
import * as React from "react"
import { FolderOpen, TriangleAlert, Upload } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { plural } from "@/lib/format"
import { IMPORT_FORMATS } from "@/lib/ingest"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fichiers choisis ou déposés. La modale se ferme, le compte rendu suit en toast. */
  onFiles: (files: File[]) => void
  /** Collection en place : l'avertissement de remplacement n'a lieu d'être que si elle existe. */
  collection: { versions: number; copies: number }
}

export function ImportDialog({ open, onOpenChange, onFiles, collection }: Props) {
  const input = React.useRef<HTMLInputElement>(null)

  const submit = (files: FileList | null) => {
    // Copiés avant tout : vider l'input, ou démonter la modale, vide la FileList.
    const list = files ? Array.from(files) : []
    if (!list.length) return
    onOpenChange(false)
    onFiles(list)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        // Un fichier lâché à côté de la zone ne doit pas faire ouvrir le JSON par
        // le navigateur, qui quitterait l'app.
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Importer des données</DialogTitle>
          <DialogDescription>
            Chaque fichier est reconnu à son contenu, pas à son nom. Plusieurs fichiers peuvent être
            importés d'un coup, et tout est conservé dans ce navigateur.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2 text-sm">
          {IMPORT_FORMATS.map((f) => (
            <li key={f.key} className="min-w-0">
              <span className="font-medium">{f.label}</span>
              <span className="text-muted-foreground"> — {f.effect}.</span>
              <div className="text-muted-foreground truncate font-mono text-xs">
                {f.files.join(" · ")}
              </div>
            </li>
          ))}
        </ul>

        {collection.versions > 0 && (
          <Alert>
            <TriangleAlert />
            <AlertDescription>
              La collection actuelle ({plural(collection.versions, "version")},{" "}
              {plural(collection.copies, "exemplaire")}) sera intégralement remplacée si une
              sauvegarde de collection fait partie des fichiers importés.
            </AlertDescription>
          </Alert>
        )}

        <Dropzone onFiles={submit} onBrowse={() => input.current?.click()} />

        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          multiple
          className="hidden"
          onChange={(e) => {
            submit(e.target.files)
            e.target.value = ""
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Zone de dépôt. Pas de composant shadcn pour ça : un élément brut, tokens
 * uniquement, et le bouton pour qui ne glisse pas — ou navigue au clavier.
 */
function Dropzone({
  onFiles,
  onBrowse,
}: {
  onFiles: (files: FileList | null) => void
  onBrowse: () => void
}) {
  const [over, setOver] = React.useState(false)
  // `dragleave` part aussi en passant sur un enfant de la zone : un compteur
  // d'entrées évite que la bordure clignote en la survolant.
  const depth = React.useRef(0)

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault()
        depth.current++
        setOver(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (!depth.current) setOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        depth.current = 0
        setOver(false)
        onFiles(e.dataTransfer.files)
      }}
      className={cn(
        "flex flex-col items-center gap-3 border-2 border-dashed px-6 py-8 text-center transition-colors",
        over ? "border-ring bg-muted" : "border-border"
      )}
    >
      <Upload className="text-muted-foreground size-6" />
      <div>
        <p className="text-sm font-medium">Déposer les fichiers ici</p>
        <p className="text-muted-foreground text-xs">JSON uniquement</p>
      </div>
      <Button size="sm" variant="outline" onClick={onBrowse}>
        <FolderOpen />
        Importer depuis les fichiers
      </Button>
    </div>
  )
}
