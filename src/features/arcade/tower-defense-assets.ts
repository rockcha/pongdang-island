const root = '/arcade/tower-defense'
export const DEFENSE_ART = {
  octopus: `${root}/octopus-v5-sprite.png`,
  seahorse: `${root}/seahorse-v5-sprite.png`,
  mortar: `${root}/mortar-v5-sprite.png`,
  flame: `${root}/flame-v5-sprite.png`,
  laser: `${root}/laser-v5-sprite.png`,
  plasma: `${root}/plasma-v5-sprite.png`,
  anemone: `${root}/anemone-v5-sprite.png`,
  missile: `${root}/missile-v1-sprite.png`,
  salvo: `${root}/salvo-v1-sprite.png`,
  sniper: `${root}/sniper-v1-sprite.png`,
  harpoon: `${root}/harpoon-v1-sprite.png`,
  frost: `${root}/frost-v1-sprite.png`,
  enemies: `${root}/enemies-v6-sprite.png`,
  field: `${root}/field-v5.svg`,
  castle: `${root}/castle-v2.svg`,
  wall: `${root}/wall-v2.svg`,
} as const
export function towerFrame(flash: number, reduced = false) {
  if (reduced || flash <= 0) return 0
  return [1, 2, 3, 0][Math.min(3, Math.max(0, Math.floor((0.4 - flash) / 0.1 + 1e-6)))]
}
