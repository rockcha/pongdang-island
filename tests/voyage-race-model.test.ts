// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
const models = JSON.parse(readFileSync('supabase/voyage-bets/generated/models.json', 'utf8'))
const calibrations = JSON.parse(
  readFileSync('supabase/voyage-bets/generated/rank-calibrations.json', 'utf8'),
)
it('binds immutable calibration data and complete monotonic stage targets to every model option', () => {
  expect(calibrations).toHaveLength(models.length)
  for (const m of models) {
    const c = calibrations.find((c: { modelId: string }) => c.modelId === m.id)
    expect(c.id).toBe(createHash('sha256').update(JSON.stringify(c.data)).digest('hex'))
    for (const option of m.data.options)
      for (const count of option.counts)
        for (const region of Object.keys(m.data.regions)) {
          const t = c.data.targets[option.baitId + ':' + count + ':' + region]
          expect(t).toHaveLength(3)
          expect(t.every(Number.isInteger)).toBe(true)
          expect(t[0]).toBeGreaterThan(0)
          expect(t[1]).toBeGreaterThan(t[0])
          expect(t[2]).toBeGreaterThan(t[1])
        }
  }
})
