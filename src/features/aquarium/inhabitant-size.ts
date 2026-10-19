import type { OwnedCollectible } from '@/features/collection/api'

// Use the same mobile allowance for whales and mythics of comparable body size.
export function inhabitantBaseSize(species:OwnedCollectible['species'],width:number){
 return Math.min(species.size,width*.48)
}
