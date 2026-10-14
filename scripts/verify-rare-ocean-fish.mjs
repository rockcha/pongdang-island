import { PGlite } from '@electric-sql/pglite'
import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'

// Isolated PostgreSQL verification: uses the actual catalog DDL from 15,
// then applies the catalog-only shape changes from 16. No remote connection.
const db = new PGlite()
const base = readFileSync('supabase/sql/15-collectibles/01-collectibles.sql', 'utf8')
const ddl = base.slice(base.indexOf('create type public.collectible_kind'), base.indexOf('create unique index aquarium_tanks'))
await db.exec(`create type public.game_rarity as enum ('common','rare','epic','mythic');
create table public.regions(id text primary key);
insert into public.regions values ('pongdang'),('coral'),('mistmoon'),('starruins'),('dreamabyss');`)
await db.exec(ddl)
const upgrade = readFileSync('supabase/sql/16-cartoon-collectibles/01-cartoon-collectibles.sql', 'utf8')
await db.exec(upgrade.slice(upgrade.indexOf('alter table public.collectible_species add column'), upgrade.indexOf('-- This sample')))
const seed = readFileSync('supabase/sql/19-rare-ocean-fish/01-rare-ocean-fish.sql', 'utf8')
await db.exec(seed)
await db.exec(seed)
// Simulate the originally deployed rare catalog, then verify the conversion twice.
await db.exec("update public.collectible_species set rarity='rare'")
const conversion = readFileSync('supabase/sql/20-large-fish-common/01-large-fish-common.sql', 'utf8')
await db.exec(conversion)
await db.exec(conversion)
const { rows } = await db.query('select * from public.collectible_species order by id')
assert.equal(rows.length, 5)
for (const row of rows) {
  assert.equal(row.kind, 'fish')
  assert.equal(row.rarity, 'common')
  assert.ok(row.sell_price >= 180 && row.sell_price <= 260)
  for (const path of [row.sprite_sheet_path, row.thumbnail_path]) {
    assert.ok(existsSync(`assets/storage-upload/collectibles/${path}`), `Missing asset: ${path}`)
  }
}
const habitats = await db.query('select count(*)::int as count from public.collectible_habitats')
assert.equal(habitats.rows[0].count, 25)
console.log('PASS: 5 large common species, 25 habitats, 10 matching assets; SQL can run twice without duplicates.')
await db.close()
