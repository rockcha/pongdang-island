export const WHACK_DURATION = 30_000
export const WHACK_HOLES = 12
export type WhackTarget = {
  id: number
  hole: number
  at: number
  until: number
  kind: 'pongi' | 'golden' | 'bomb' | 'impostor' | 'hay' | 'sandcastle'
}
export type WhackHit = { id: number; ms: number }
export function whackMotion(at: number) {
  const progress = Math.min(1, Math.max(0, at / 30000))
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
/** Practice only. Paid boards are generated and retained on the server. */
export function practiceWhack(random = Math.random, requestedGoldenCount = 1): WhackTarget[] {
  const targets: WhackTarget[] = [],
    free = Array(WHACK_HOLES).fill(0)
  const goldenCount = [2, 4, 10].includes(requestedGoldenCount) ? requestedGoldenCount : 1
  const goldenDue = Array.from({length:goldenCount},(_,i)=>goldenCount===1
    ? 5_000 + Math.floor(random() * 21_000)
    : 3_000 + Math.floor((i + random()) * 24_000 / goldenCount))
  let golden = 0
  for (let at = 500; at < 29_000;) {
    const available = free.map((until, hole) => ({ until, hole })).filter((h) => h.until <= at)
    if (available.length) {
      const hole = available[Math.floor(random() * available.length)].hole
      const roll = random()
      const kind =
        golden < goldenCount && at >= goldenDue[golden]
          ? 'golden'
          : roll < (at < 10_000 ? 0.16 : at < 20_000 ? 0.28 : 0.4)
            ? (['impostor', 'hay', 'sandcastle'] as const)[Math.floor(random() * 3)]
            : 'pongi'
      if (kind === 'golden') golden++
      const until = Math.min(
        WHACK_DURATION,
        at + (kind === 'golden' ? 1000 : Math.round(1100 - 500 * Math.min(1, at / 30000))),
      )
      targets.push({ id: targets.length, hole, at, until, kind })
      free[hole] = until + 100
    }
    at += at < 10_000 ? 600 : at < 20_000 ? 420 : 300
  }
  return targets
}
