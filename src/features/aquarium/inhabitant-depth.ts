import type { OwnedCollectible } from '@/features/collection/api'
import { glassAttachedSpecies } from './glass-attached-species'

export const maxDisplayLayer = 800
export function automaticInhabitantDepth(item: OwnedCollectible) {
  return (item.species.kind === 'fish' ? 200 : 0) + (glassAttachedSpecies.has(item.species.id) ? 100 : 0)
}
export function inhabitantDepth(item: OwnedCollectible) {
  return item.display_layer ?? automaticInhabitantDepth(item)
}
