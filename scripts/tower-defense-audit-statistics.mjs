export function quantile(values, p) {
  if (!values.length) return null
  const a = [...values].sort((a, b) => a - b),
    index = (a.length - 1) * p,
    low = Math.floor(index),
    t = index - low
  return a[low] * (1 - t) + a[Math.min(a.length - 1, low + 1)] * t
}
export function proportion(successes, n) {
  if (!n) return { successes, n, rate: null, low: null, high: null }
  const z = 1.959963984540054,
    p = successes / n,
    d = 1 + (z * z) / n,
    center = (p + (z * z) / (2 * n)) / d,
    half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d
  return {
    successes,
    n,
    rate: p,
    low: Math.max(0, center - half),
    high: Math.min(1, center + half),
  }
}
export function summarize(records, maxWaves = 50) {
  const complete = records.filter((r) => !r.timedOut),
    n = complete.length
  const waves = Array.from({ length: maxWaves }, (_, i) => {
    const wave = i + 1,
      entries = complete.map((r) => r.checkpoints.find((c) => c.wave === wave)).filter(Boolean),
      passes = entries.filter((c) => c.cleared).length
    const leaks = {}
    for (const c of entries)
      for (const [kind, count] of Object.entries(c.leaks)) leaks[kind] = (leaks[kind] ?? 0) + count
    return {
      wave,
      reached: entries.length,
      cleared: passes,
      failed: entries.length - passes,
      cumulative: proportion(passes, n),
      conditional: proportion(passes, entries.length),
      noLeak: proportion(
        entries.filter((c) => c.cleared && Object.values(c.leaks).every((n) => n === 0)).length,
        entries.length,
      ),
      medianEntryHp: quantile(
        entries.map((c) => c.entryHp),
        0.5,
      ),
      medianExitHp: quantile(
        entries.map((c) => c.exitHp),
        0.5,
      ),
      medianGold: quantile(
        entries.map((c) => c.exitGold),
        0.5,
      ),
      medianSeconds: quantile(
        entries.map((c) => c.seconds),
        0.5,
      ),
      medianRouteTiles: quantile(
        entries.flatMap((c) => c.routeTiles),
        0.5,
      ),
      medianWalls: quantile(
        entries.map((c) => c.wallCount),
        0.5,
      ),
      medianTowers: quantile(
        entries.map((c) => c.towerCount),
        0.5,
      ),
      leaks,
    }
  })
  return {
    n,
    timeouts: records.length - n,
    win: proportion(complete.filter((r) => r.phase === 'won').length, n),
    medianReached: quantile(
      complete.map((r) => r.reached),
      0.5,
    ),
    medianCleared: quantile(
      complete.map((r) => r.cleared),
      0.5,
    ),
    p25Reached: quantile(
      complete.map((r) => r.reached),
      0.25,
    ),
    p75Reached: quantile(
      complete.map((r) => r.reached),
      0.75,
    ),
    minReached: n ? Math.min(...complete.map((r) => r.reached)) : null,
    maxReached: n ? Math.max(...complete.map((r) => r.reached)) : null,
    medianGold: quantile(
      complete.map((r) => r.gold),
      0.5,
    ),
    medianIncome: quantile(
      complete.map((r) => r.income),
      0.5,
    ),
    medianSpent: quantile(
      complete.map((r) => r.spent),
      0.5,
    ),
    medianSeconds: quantile(
      complete.map((r) => r.seconds),
      0.5,
    ),
    failureWaves: waves
      .filter((w) => w.failed)
      .map((w) => ({ wave: w.wave, failed: w.failed, reached: w.reached }))
      .sort((a, b) => b.failed - a.failed),
    waves,
  }
}
