// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
import {
  mythicSwimAsset,
  mythicSwimFrame,
  mythicSwimLayout,
  mythicSheetColumns,
} from '../src/features/aquarium/mythic-swim'
import { InhabitantMotion } from '../src/features/aquarium/inhabitant-motion'
import catalog from '../supabase/catalog/catalog.json'
const root = 'assets/storage-upload/new/20261025-103445',
  read = (p) => JSON.parse(readFileSync(root + '/' + p, 'utf8').replace(/^\uFEFF/, ''))
const manifest = read('manifest.json'),
  registrations = read('registration.json')
let db
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 60000)
afterAll(async () => {
  await db?.close()
})
it('registers both requested prices as moving mythic common-region creatures without an event restriction', async () => {
  for (const s of manifest.items) {
    const row = (
      await db.query(
        'select rarity,sell_price,native_region_id,movement_type from public.collectible_species where id=$1',
        [s.id],
      )
    ).rows[0]
    expect(row).toEqual({
      rarity: 'mythic',
      sell_price: s.id.includes('salvager') ? 3400 : 3300,
      native_region_id: null,
      movement_type: 'swim',
    })
    expect(
      (
        await db.query(
          'select count(*)::int n from public.collectible_habitats where species_id=$1',
          [s.id],
        )
      ).rows[0].n,
    ).toBe(catalog.regions.length)
    expect(
      (
        await db.query(
          "select app_private.collectible_available_at($1,'2026-11-02T00:00:00+09:00') available",
          [s.id],
        )
      ).rows[0].available,
    ).toBe(true)
  }
})
it('uses real eight-frame assets for aquarium and collection, keeps measured anchors and repeats after six seconds', () => {
  for (const s of manifest.items) {
    const row = catalog.collectible_species.find((e) => e.id === s.id)!,
      asset = mythicSwimAsset(row.sprite_sheet_path, 'mythic')!
    expect(asset).not.toBeNull()
    expect(mythicSheetColumns(asset.path)).toBe(4)
    const png = readFileSync('public' + asset.url)
    expect(png.readUInt32BE(16) / png.readUInt32BE(20)).toBe(2)
    expect(
      new Set(Array.from({ length: 120 }, (_, i) => mythicSwimFrame(asset.path, i / 20, 0))).size,
    ).toBe(8)
    const r = registrations.find((r) => r.id === s.id)
    for (let f = 0; f < 8; f++) {
      const l = mythicSwimLayout(asset.path, f)!,
        measured = r.frames[f]
      expect((r.patch[0] + measured.dx - l.originX * r.cell) * l.scale).toBeCloseTo(
        (r.patch[0] - 0.5 * r.cell) * l.scale,
      )
      expect((r.patch[1] + measured.dy - l.originY * r.cell) * l.scale).toBeCloseTo(
        (r.patch[1] - 0.5 * r.cell) * l.scale,
      )
    }
    for (const t of [0, 1, 3.9, 4.1, 5.2, 5.9])
      expect(mythicSwimFrame(asset.path, t + 6, 123)).toBe(mythicSwimFrame(asset.path, t, 123))
    expect(mythicSwimFrame(asset.path, 5, 123, true)).toBe(0)
  }
})
it('has safe original cell margins, changing component pixels, and matching asset hashes', () => {
  for (const r of registrations) {
    for (const b of r.rawAudit.bounds) {
      const cw = r.rawAudit.width / 4,
        ch = r.rawAudit.height / 2
      expect(Math.min(b[0], b[1], cw - b[0] - b[2], ch - b[1] - b[3])).toBeGreaterThanOrEqual(
        cw * 0.08,
      )
    }
  }
  for (const s of manifest.items)
    for (const p of [s.thumbnail_path, s.sprite_sheet_path, s.catalog_sprite_sheet_path])
      expect(
        createHash('sha256')
          .update(readFileSync(root + '/' + p))
          .digest('hex'),
      ).toBe(s.hashes[p])
  for (const region of read('motion-regions.json'))
    expect(Math.max(...region.rmsAgainstFrame0), region.id + ' ' + region.part).toBeGreaterThan(5)
})
it('moves both creatures across the wide aquarium while respecting their configured depths', () => {
  for (const s of manifest.items) {
    const species = catalog.collectible_species.find((e) => e.id === s.id)!,
      motion = new InhabitantMotion({
        id: 'test-' + s.id,
        species_id: s.id,
        tank_id: 'review',
        animation_seed: 271828,
        position_x: null,
        position_y: null,
        species,
      } as any)
    const first = { ...motion.update(0, 0.016, 1170, 500) },
      last = { ...motion.update(43, 0.016, 1170, 500) }
    expect(Math.abs(first.x - last.x) + Math.abs(first.y - last.y)).toBeGreaterThan(1)
    for (const p of [first, last]) {
      const y = p.y / (500 - p.size)
      expect(y).toBeGreaterThanOrEqual(Number(species.swim_y_min) - 0.01)
      expect(y).toBeLessThanOrEqual(Number(species.swim_y_max) + 0.01)
    }
  }
})
