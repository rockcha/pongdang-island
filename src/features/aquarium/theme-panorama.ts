import panoramas from './theme-panoramas.json'
import { backgroundUrl } from './api'

// Keep catalog IDs and saved decoration coordinates intact across the art update.
export function themePanoramaUrl(imagePath: string | undefined): string | undefined {
  if (!imagePath) return undefined
  const filename = (panoramas as Record<string, string>)[imagePath]
  if (!filename) return undefined
  return import.meta.env.DEV
    ? `/assets/storage-upload/new/20261025-014955/aquarium-backgrounds/${filename}`
    : backgroundUrl(filename)
}
