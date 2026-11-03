export const WHACK_DURATION = 30_000
export const WHACK_HOLES = 12
export type WhackTarget = {
  id: number
  hole: number
  at: number
  until: number
  kind: 'pongi' | 'golden' | 'bomb' | 'impostor' | 'hay' | 'sandcastle'
  sinkMs?: number
}
export type WhackHit = { id: number; ms: number }
export function whackMotion(at: number, duration = WHACK_DURATION) {
  const progress = Math.min(1, Math.max(0, at / duration))
  return { riseMs: 180 - 100 * progress, sinkMs: 170 - 90 * progress }
}
export const whackPoints = (kind: WhackTarget['kind']) =>
  kind === 'golden' ? 10 : kind === 'pongi' ? 1 : -2
export function scoreWhack(targets: WhackTarget[], hits: WhackHit[]) {
  let score = 0,
    mistakes = 0
  const seen = new Set<number>()
  for (const hit of hits) {
    const target = targets.find((t) => t.id === hit.id)
    if (!target || seen.has(hit.id) || hit.ms < target.at + 80 || hit.ms >= target.until) continue
    seen.add(hit.id)
    score = Math.max(0, score + whackPoints(target.kind))
    if (whackPoints(target.kind) < 0) mistakes++
  }
  return { score, mistakes, hits: seen.size }
}
export function whackTiming(at: number, variation = .5) {
  const progress = Math.min(1, Math.max(0, (at - 10000) / 20000))
  const smooth = progress * progress * (3 - 2 * progress)
  const offset = Math.min(1, Math.max(0, variation)) * 2 - 1
  return { lifetimeMs: Math.round(1000 - 250 * smooth + offset * 40), sinkMs: Math.round(170 - 90 * smooth + offset * 8) }
}
/** Practice only. Keep the pattern in sync with the server-generated paid board. */
export function practiceWhack(random = Math.random, requestedGoldenCount = 1): WhackTarget[] {
  const targets: WhackTarget[] = [], free = Array(WHACK_HOLES).fill(0)
  const goldenCount = [2, 4, 10].includes(requestedGoldenCount) ? requestedGoldenCount : 1
  const goldenDue = Array.from({length: goldenCount}, (_, i) => 4000 + Math.floor((i + random()) * 24000 / goldenCount))
  let golden = 0
  for (let at = 500; at < 29200;) {
    const stage = at < 10000 ? 0 : at < 20000 ? 1 : at < 25000 ? 2 : 3
    const waveSize = stage === 0 ? 1 : 5, fakeChance = [.365, .515, .615, .685][stage]
    const available = free.map((until, hole) => ({until, hole})).filter(h => h.until <= at)
    for (let i = 0; i < waveSize && available.length; i++) {
      const {hole} = available.splice(Math.floor(random() * available.length), 1)[0]
      const kind: WhackTarget['kind'] = golden < goldenCount && at >= goldenDue[golden]
        ? 'golden' : random() < fakeChance
          ? (['impostor', 'hay', 'sandcastle'] as const)[Math.floor(random() * 3)] : 'pongi'
      if (kind === 'golden') golden++
      const timing = whackTiming(at, random())
      const until = Math.min(WHACK_DURATION, at + (kind === 'golden' ? 1100 : timing.lifetimeMs))
      targets.push({id: targets.length, hole, at, until, kind, sinkMs: timing.sinkMs})
      free[hole] = until + 100
    }
    at += stage === 0 ? 1100 : 700
  }
  return targets
}
