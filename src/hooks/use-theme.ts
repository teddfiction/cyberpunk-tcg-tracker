/** Bascule clair/sombre : préférence système au premier chargement, choix mémorisé ensuite. */
import * as React from "react"

const KEY = "cptcg-theme"

/** Thème clair/sombre : préférence système au premier chargement, choix mémorisé ensuite. */
export function useTheme() {
  const [dark, setDark] = React.useState<boolean>(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null
    if (stored) return stored === "dark"
    return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
  })

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem(KEY, dark ? "dark" : "light")
  }, [dark])

  return { dark, toggle: React.useCallback(() => setDark((d) => !d), []) }
}
