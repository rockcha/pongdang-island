import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
export function RarityBadge({ rarity,filled=false }: { rarity: Rarity;filled?:boolean }) {
 const value=rarities[rarity]
 if(filled)return <span className={`${value.className} inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium`}>{value.label}</span>
 return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground"><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{backgroundColor:value.effectColor}}/>{value.label}</span>
}
