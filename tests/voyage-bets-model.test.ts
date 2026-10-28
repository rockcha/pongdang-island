// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
const models = JSON.parse(readFileSync('supabase/voyage-bets/generated/models.json', 'utf8'))
it('keeps complete targets for every public plan, validates pool mass and freezes model identity', () => {
  expect(models).toHaveLength(2)
  expect(models[0].validUntil).toBe(models[1].validFrom)
  for (const model of models) {
    const m = model.data
    expect(model.id).toMatch(/^[a-f0-9]{64}$/)
    expect(new Set(m.companies.map((c: { id: string }) => c.id)).size).toBe(4)
    for (const option of m.options) {
      expect(Math.abs(option.base * m.baits[option.baitId].price - 1600)).toBeLessThanOrEqual(
        m.baits[option.baitId].price / 2,
      )
      for (const count of option.counts)
        for (const region of Object.keys(m.regions))
          expect(m.targets[`${option.baitId}:${count}:${region}`]).toBeGreaterThan(0)
    }
    for (const [baitId, b] of Object.entries(m.baits) as [
      string,
      { common: number; rare: number; epic: number; mythic: number },
    ][]) {
      expect(b.common + b.rare + b.epic + b.mythic).toBe(10000)
      for (const grade of ['common', 'rare', 'epic', 'mythic'])
        for (const region of Object.keys(m.regions)) {
          if (!b[grade as keyof typeof b]) continue
          const g = m.pools[baitId][grade]
          expect(g.shared.length + g.native.length).toBeGreaterThan(0)
          expect(g.home[region].every((id: string) => m.species[id].region === region)).toBe(true)
        }
    }
  }
  // The payload binds a target to public information; hidden region IDs are not a key.
  const sql = readFileSync('supabase/migrations/20261028162133_voyage_bets_market.sql', 'utf8')
  expect(sql).toContain("bid||':'||n||':'||places[1]")
})
