// Shared by regions, future fish and items. Keep keys in sync with public.game_rarity.
export const rarities = {
 common: { label: '일반', effectColor:'#94a3b8', rank: 0, className: 'rarity-common' },
 rare: { label: '희귀', effectColor:'#3b82f6', rank: 1, className: 'rarity-rare' },
 epic: { label: '특급', effectColor:'#a855f7', rank: 2, className: 'rarity-epic' },
 mythic: { label: '신화', effectColor:'#f59e0b', rank: 3, className: 'rarity-mythic' },
} as const
export type Rarity = keyof typeof rarities
