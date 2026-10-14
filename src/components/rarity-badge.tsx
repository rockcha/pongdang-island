import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
export function RarityBadge({ rarity }: { rarity: Rarity }) {
 const value=rarities[rarity]
 return <span className={`${value.className} rounded-full border px-2 py-0.5 text-xs font-medium`}>{value.label}</span>
}
