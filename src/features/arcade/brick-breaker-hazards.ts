import { BOARD, TORPEDO_HAZARD } from './brick-breaker-config'
import type { Drop } from './brick-breaker-model'

export function advanceTorpedo(drop: Drop) {
  const t = Math.min(1, (drop.age ?? 0) / TORPEDO_HAZARD.countdown)
  const x = drop.originX ?? drop.x,
    y = drop.originY ?? drop.y
  drop.x = x + ((drop.targetX ?? x) - x) * t
  drop.y = y + ((drop.targetY ?? y) - y) * t
  return t >= 1
}

export function advanceAnchor(drop: Drop, dt: number) {
  drop.vy = Math.min(640, (drop.vy ?? 6) + (60 + 220 * (drop.age ?? 0)) * dt)
  drop.y += drop.vy * dt
}

export function advanceSwimmer(drop: Drop, dt: number) {
  const age = drop.age ?? 0
  if (drop.kind === 'jelly') {
    drop.originX ??= drop.x
    drop.x = Math.max(24, Math.min(BOARD.width - 24, drop.originX + Math.sin(age * 2.4) * 28))
    drop.y += (28 + Math.sin(age * 2.4) * 3) * dt
    return
  }
  drop.x += ((drop.vx ?? 12) + Math.sin(age * 2.2 + drop.id) * 6) * dt
  drop.y += ((drop.vy ?? 38) + Math.sin(age * 2) * 4) * dt
  const margin = 27
  if (drop.x < margin) {
    drop.x = margin
    drop.vx = Math.abs(drop.vx ?? 24)
  } else if (drop.x > BOARD.width - margin) {
    drop.x = BOARD.width - margin
    drop.vx = -Math.abs(drop.vx ?? 24)
  }
}
