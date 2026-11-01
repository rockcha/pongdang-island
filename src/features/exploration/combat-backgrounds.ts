import type {MonsterId} from './monster-catalog'

export const combatBackgrounds = [
  "sunken-sandstone",
  "lapis-star-vault",
  "emerald-sanctuary",
  "obsidian-hall",
  "turquoise-cistern",
  "alabaster-memorial",
  "amethyst-gallery",
  "buried-sanctuary"
] as const

export const bossCombatBackgrounds = {
 'obsidian-anubis':'anubis-judgment',
 'nameless-royal-warden':'warden-sealed-gate',
 'golden-pharaoh':'rasef-sun-throne',
} as const satisfies Partial<Record<MonsterId,string>>

export type RandomCombatBackground = typeof combatBackgrounds[number]
export type BossCombatBackground = typeof bossCombatBackgrounds[keyof typeof bossCombatBackgrounds]
export type CombatBackground = RandomCombatBackground | BossCombatBackground
export const combatBackgroundUrl = (id: CombatBackground) => `/exploration/${combatBackgrounds.some(value=>value===id)?'combat-backgrounds':'boss-backgrounds'}/${id}.webp`

// Boss identity owns the arena, including direct test fights and resumed combat.
// Its dedicated background never enters the ordinary monster random pool.
export function resolveCombatBackground(monsterId: MonsterId | undefined, fallback: CombatBackground = combatBackgrounds[0]): CombatBackground {
 const bosses: Partial<Record<MonsterId,BossCombatBackground>> = bossCombatBackgrounds
 return (monsterId && bosses[monsterId]) || fallback
}

// Draw once at encounter entry; rerenders and combat turns keep the same arena.
export function drawCombatBackground(previous?: RandomCombatBackground, random = Math.random): RandomCombatBackground {
 const choices = combatBackgrounds.filter(id => id !== previous)
 return choices[Math.max(0, Math.min(choices.length - 1, Math.floor(random() * choices.length)))]
}
