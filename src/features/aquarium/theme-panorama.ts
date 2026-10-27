import panoramas from './theme-panoramas.json'
import { backgroundUrl } from './api'

// Resolve artwork without changing catalog IDs; wide tanks use full-width placement.
export function themePanoramaUrl(imagePath: string | undefined): string | undefined {
  if (!imagePath) return undefined
  const entry = (panoramas as Record<string, string | {file: string; localPath: string}>)[imagePath]
  if (!entry) return undefined
  const filename = typeof entry === 'string' ? entry : entry.file
  return import.meta.env.DEV
    ? typeof entry === 'string'
      ? `/assets/storage-upload/new/20261025-014955/aquarium-backgrounds/${filename}`
      : `/${entry.localPath}`
    : backgroundUrl(filename)
}
