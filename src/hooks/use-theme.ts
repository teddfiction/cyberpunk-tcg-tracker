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
    const root = document.documentElement
    // Transitions coupées pendant la bascule (`.theme-switching`, index.css) :
    // la page change d'un coup, les commandes aussi. Retirée deux images plus
    // tard — la première calcule les nouvelles couleurs sans transition ; à la
    // seconde, plus rien ne change, donc plus rien ne glisse.
    root.classList.add("theme-switching")
    root.classList.toggle("dark", dark)
    localStorage.setItem(KEY, dark ? "dark" : "light")
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => root.classList.remove("theme-switching"))
    })
    return () => {
      cancelAnimationFrame(frame)
      root.classList.remove("theme-switching")
    }
  }, [dark])

  return { dark, toggle: React.useCallback(() => setDark((d) => !d), []) }
}
