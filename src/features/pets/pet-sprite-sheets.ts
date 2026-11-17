import type { PetSpeciesId } from './pet-catalog'

export type PetSpriteSheet = 'atlas16' | 'idle8' | 'needs8' | 'happy8' | 'eat8'

const correctedAtlases: ReadonlySet<PetSpeciesId> = new Set([
  'bonbon-triceratops',
  'coco-capybara',
  'nurung-fox',
  'peach-axolotl',
  'cloud-alpaca',
  'hedge-pin',
])

// Use a new URL for repaired anatomy so decoded/browser/PWA caches cannot
// keep serving the previous limbs. Preloading and drawing share this boundary.
export function petSpriteSheetUrl(speciesId: PetSpeciesId, sheet: PetSpriteSheet) {
  const version =
    sheet === 'idle8' ||
    (sheet === 'atlas16' && correctedAtlases.has(speciesId)) ||
    (sheet === 'needs8' && speciesId === 'mochi-dragon')
      ? 2
      : 1
  return `/pets/${speciesId}_${sheet}_v${version}_sprite.png`
}
