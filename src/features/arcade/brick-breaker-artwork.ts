import type { DropKind } from './brick-breaker-model'
import { BOARD } from './brick-breaker-config'

export const brickMaterials = {
  4: '/arcade/brick-breaker/tile-4.png',
  3: '/arcade/brick-breaker/tile-3.png',
  2: '/arcade/brick-breaker/tile-2.png',
  1: '/arcade/brick-breaker/tile-1-cracked.png',
} as const

export const dropArtwork: Record<DropKind, { src: string; sheet: boolean; preview?: string }> = {
  item: { src: '/arcade/brick-breaker/item.png', sheet: false },
  wide: { src: '/arcade/brick-breaker/wide.png', sheet: false },
  shield: { src: '/arcade/brick-breaker/shield.png', sheet: false },
  split: { src: '/arcade/brick-breaker/split.png', sheet: false },
  shark: { src: '/arcade/brick-breaker/shark-sprite.png', sheet: true },
  urchin: { src: '/arcade/brick-breaker/urchin.svg', sheet: false },
  ink: { src: '/arcade/brick-breaker/ink.svg', sheet: false },
  seaweed: { src: '/arcade/brick-breaker/seaweed.svg', sheet: false },
  puffer: {
    src: '/arcade/brick-breaker/puffer-sprite.png',
    sheet: true,
    preview: '/arcade/brick-breaker/puffer.png',
  },
  heart: { src: '/arcade/brick-breaker/heart.svg', sheet: false },
  sticky: { src: '/arcade/brick-breaker/sticky.svg', sheet: false },
  shrink: { src: '/arcade/brick-breaker/shrink.svg', sheet: false },
  magnet: { src: '/arcade/brick-breaker/magnet.svg', sheet: false },
  wave: {
    src: '/arcade/brick-breaker/wave-projectile-sprite.png',
    sheet: true,
    preview: '/arcade/brick-breaker/wave-icon.png',
  },
  dash: {
    src: '/arcade/brick-breaker/pongi-dash-sprite.png',
    sheet: true,
    preview: '/arcade/brick-breaker/pongi-dash-icon.png',
  },
  star: { src: '/arcade/brick-breaker/star-shuriken.png', sheet: false },
  pirate: { src: '/arcade/brick-breaker/pirate-coin.png', sheet: false },
  whale: { src: '/arcade/brick-breaker/humpback-song.png', sheet: false },
  treasure: { src: '/arcade/brick-breaker/naval-treasure.png', sheet: false },
  anchor: { src: '/arcade/brick-breaker/heavy-anchor.png', sheet: false },
  jelly: {
    src: '/arcade/brick-breaker/poison-jelly-sprite.png',
    sheet: true,
    preview: '/arcade/brick-breaker/poison-jelly-icon.png',
  },
  torpedo: { src: '/arcade/brick-breaker/enemy-torpedo.png', sheet: false },
  poison: { src: '/arcade/brick-breaker/poison-bottle.svg', sheet: false },
}

// Phaser 4 uses a physical drawing buffer and an inverse scale zoom. Keep
// simulation coordinates independent of DPR; cap GPU work on mobile devices.
export function brickCamera(pixelWidth: number, pixelHeight: number) {
  const zoom = Math.min(pixelWidth / BOARD.width, pixelHeight / BOARD.height)
  const width = BOARD.width * zoom,
    height = BOARD.height * zoom
  return { x: (pixelWidth - width) / 2, y: (pixelHeight - height) / 2, width, height, zoom }
}

export function brickViewport(width: number, height: number, dpr: number) {
  const w = Math.max(1, Math.round(width) || 1),
    h = Math.max(1, Math.round(height) || 1)
  const ratio = Math.min(
    Math.max(1, Number.isFinite(dpr) ? dpr : 1),
    1.5,
    Math.sqrt(2000000 / (w * h)),
  )
  return {
    width: w,
    height: h,
    pixelWidth: Math.round(w * ratio),
    pixelHeight: Math.round(h * ratio),
    ratio,
  }
}
