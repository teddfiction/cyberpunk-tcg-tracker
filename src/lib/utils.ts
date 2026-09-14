/** `cn()` : fusion des classes Tailwind, utilitaire attendu par les composants shadcn. */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
