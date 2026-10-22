import {GoldIcon} from '@/features/gold/gold-provider'

const treasureTrashIds=new Set([
 'soaked-banknote-bundle',
 'soaked-money-pouch',
 'pirate-gold-coin-sack',
 'gold-dust-glass-bottle',
 'salvaged-gold-fragment',
 'pirate-coin-bundle',
 'dragon-king-vault',
])

export function TreasureTrashBadge({speciesId}:{speciesId:string}){
 if(!treasureTrashIds.has(speciesId))return null
 return <span className="inline-flex shrink-0 items-center" role="img" aria-label="돈·보물 쓰레기" title="돈·보물 쓰레기"><GoldIcon className="size-6 drop-shadow-sm"/></span>
}
