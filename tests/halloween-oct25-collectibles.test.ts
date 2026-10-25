// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
import catalog from '../supabase/catalog/catalog.json'
import layouts from '../src/features/aquarium/halloween-frame-layouts.json'
import facing from '../src/features/aquarium/artwork-facing.json'
import releases from '../src/features/regions/species-releases.json'
import { InhabitantMotion } from '../src/features/aquarium/inhabitant-motion'
const expected = [
  ['halloween-skeleton-fish', 'fish', 'common', 60],
  ['halloween-cursed-sailor-souls', 'fish', 'rare', 350],
  ['halloween-soul-lantern-angler', 'fish', 'epic', 1260],
  ['halloween-zombie-puffer', 'fish', 'rare', 335],
  ['halloween-infected-turtle', 'fish', 'rare', 340],
  ['halloween-cobweb-bundle', 'trash', 'common', 12],
  ['halloween-torn-black-cloak', 'trash', 'common', 16],
] as const
let db
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 60000)
afterAll(async () => {
  await db?.close()
})
it('registers the requested rarities, prices and all-region habitats in the replayed database', async () => {
  for (const [id, kind, rarity, sell_price] of expected) {
    const { rows } = await db.query(
      'select id,kind,rarity,sell_price,movement_type,swim_y_min,swim_y_max,flip_with_direction from public.collectible_species where id=$1',
      [id],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id,
      kind,
      rarity,
      sell_price,
      flip_with_direction: kind === 'fish',
    })
    expect(rows[0].movement_type).toBe(
      kind === 'trash' ? 'fixed' : id.includes('souls') ? 'pulse' : 'swim',
    )
    expect(Number(rows[0].swim_y_min)).toBeLessThan(Number(rows[0].swim_y_max))
    expect(
      (
        await db.query('select region_id from public.collectible_habitats where species_id=$1', [
          id,
        ])
      ).rows
        .map((r) => r.region_id)
        .sort(),
    ).toEqual(catalog.regions.map((r) => r.id).sort())
  }
})
it('allows all seven only inside the configured Halloween event', async () => {
  for (const [id] of expected) {
    for (const [at, allowed] of [
      ['2026-10-25T12:00:00+09:00', true],
      ['2026-11-01T00:00:00+09:00', false],
    ] as const) {
      expect(
        (
          await db.query(
            'select app_private.collectible_available_at($1,$2::timestamptz) allowed',
            [id, at],
          )
        ).rows[0].allowed,
      ).toBe(allowed)
    }
  }
})
it('ships real artwork, measured right-facing fish frames, and one release entry per new species', () => {
  const root = 'assets/storage-upload/new/20261025-071108',
    manifest = JSON.parse(readFileSync(root + '/manifest.json', 'utf8'))
  for (const [id, kind] of expected) {
    const row = catalog.collectible_species.find((s) => s.id === id)!,
      entry = manifest.items.find((s) => s.id === id)
    expect(entry).toBeTruthy()
    expect(releases.filter((r) => r.speciesIds.includes(id))).toHaveLength(1)
    for (const path of [row.thumbnail_path, row.sprite_sheet_path].filter(Boolean)) {
      const png = readFileSync(root + '/' + path)
      expect(png.subarray(1, 4).toString()).toBe('PNG')
      expect(createHash('sha256').update(png).digest('hex')).toBe(entry.hashes[path!])
    }
    if (kind === 'fish') {
      const layout = layouts[row.sprite_sheet_path!]
      expect(layout.shifts).toHaveLength(4)
      expect(facing.find((f) => f.path === row.sprite_sheet_path)?.facing).toBe('right')
    } else expect(row.sprite_sheet_path).toBeNull()
  }
})
it('moves the fish in their depth ranges and leaves the rubbish stationary in a wide tank', () => {
  for (const [id, kind] of expected) {
    const species = catalog.collectible_species.find((s) => s.id === id)!
    const motion = new InhabitantMotion({
      id: 'motion-' + id,
      species_id: id,
      tank_id: 'test',
      animation_seed: 137123,
      position_x: null,
      position_y: null,
      species,
    } as any)
    const first = { ...motion.update(0, 0.016, 1170, 500) },
      last = { ...motion.update(43, 0.016, 1170, 500) }
    for (const pose of [first, last]) {
      const y = pose.y / (500 - pose.size)
      expect(y).toBeGreaterThanOrEqual(Number(species.swim_y_min) - 0.01)
      expect(y).toBeLessThanOrEqual(Number(species.swim_y_max) + 0.01)
    }
    if (kind === 'trash') {
      expect(last.x).toBe(first.x)
      expect(last.y).toBe(first.y)
      expect(last.frame).toBe(0)
    } else expect(Math.abs(last.x - first.x) + Math.abs(last.y - first.y)).toBeGreaterThan(1)
  }
})
