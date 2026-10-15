import { PGlite } from '@electric-sql/pglite'
import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'

const db = new PGlite()
try {
  const base = readFileSync('supabase/sql/15-collectibles/01-collectibles.sql', 'utf8')
  await db.exec(`create type public.game_rarity as enum ('common','rare','epic','mythic');
    create table public.regions(id text primary key);
    insert into public.regions values ('pongdang'),('coral'),('mistmoon'),('starruins'),('dreamabyss');`)
  await db.exec(base.slice(base.indexOf('create type public.collectible_kind'), base.indexOf('create unique index aquarium_tanks')))
  const upgrade = readFileSync('supabase/sql/16-cartoon-collectibles/01-cartoon-collectibles.sql', 'utf8')
  await db.exec(upgrade.slice(upgrade.indexOf('alter table public.collectible_species add column'), upgrade.indexOf('-- This sample')))
  // An existing decoration and its ownership must survive both seed applications.
  await db.exec(`insert into public.collectible_species
    (id,kind,name,description,speed,size,rarity,thumbnail_path,sell_price)
    values ('existing-house','decoration','기존 집','보존 확인',0,94,'common','existing.png',120);
    create table public.player_collectibles(id text primary key,species_id text references public.collectible_species(id),position_x numeric,position_y numeric);
    insert into public.player_collectibles values ('owned-house','existing-house',0.2,0.3);`)
  const seed = readFileSync('supabase/sql/24-common-decorations/01-common-decorations.sql', 'utf8')
  await db.exec(seed)
  await db.exec(`insert into public.player_collectibles values ('owned-starfish','apricot-starfish',0.7,0.15);`)
  await db.exec(seed)
  const { rows } = await db.query("select * from public.collectible_species where id <> 'existing-house'")
  assert.equal(rows.length, 3)
  for (const row of rows) {
    assert.equal(row.kind, 'decoration')
    assert.equal(row.rarity, 'common')
    assert.equal(Number(row.speed), 0)
    assert.equal(row.swim_y_min, null)
    assert.equal(row.swim_y_max, null)
    assert.equal(row.sprite_sheet_path, null)
    assert.ok(row.size >= 46 && row.size <= 58)
    const path = `assets/storage-upload/collectibles/${row.thumbnail_path}`
    assert.ok(existsSync(path), `Missing asset: ${path}`)
    const png = readFileSync(path)
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png[25], 6, 'Asset must be RGBA PNG')
  }
  const habitats = await db.query('select species_id,count(*)::int as count from public.collectible_habitats group by species_id')
  assert.equal(habitats.rows.length, 3)
  for (const row of habitats.rows) assert.equal(row.count, 5)
  const owned = await db.query('select id,position_x::float as x,position_y::float as y from public.player_collectibles order by id')
  assert.deepEqual(owned.rows, [{ id: 'owned-house', x: 0.2, y: 0.3 }, { id: 'owned-starfish', x: 0.7, y: 0.15 }])
  console.log('PASS: 3 small common decorations, 15 habitats, RGBA assets; repeat application preserves ownership and positions.')
} finally {
  await db.close()
}
