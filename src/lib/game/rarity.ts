// Shared by regions, future fish and items. Keep keys in sync with public.game_rarity.
export const rarities = {
 common: { label: '일반', rank: 0, className: 'rarity-common' },
 rare: { label: '희귀', rank: 1, className: 'rarity-rare' },
 epic: { label: '특급', rank: 2, className: 'rarity-epic' },
 mythic: { label: '신화', rank: 3, className: 'rarity-mythic' },
} as const
export type Rarity = keyof typeof rarities
