import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
export function RarityBadge({ rarity }: { rarity: Rarity }) {
 const value=rarities[rarity]
 return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground"><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{backgroundColor:value.effectColor}}/>{value.label}</span>
}
