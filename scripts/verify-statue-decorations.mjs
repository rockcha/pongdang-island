import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite()
const ids=['moonlit-jellyfish-lantern','coral-covered-treasure-chest','sleeping-seahorse-statue','pongi-statue']
try {
  const base=readFileSync('supabase/sql/15-collectibles/01-collectibles.sql','utf8')
  await db.exec(`create type public.game_rarity as enum ('common','rare','epic','mythic');
    create table public.regions(id text primary key);
    insert into public.regions values ('pongdang'),('coral'),('mistmoon'),('starruins'),('dreamabyss');`)
  await db.exec(base.slice(base.indexOf('create type public.collectible_kind'),base.indexOf('create unique index aquarium_tanks')))
  const upgrade=readFileSync('supabase/sql/16-cartoon-collectibles/01-cartoon-collectibles.sql','utf8')
  await db.exec(upgrade.slice(upgrade.indexOf('alter table public.collectible_species add column'),upgrade.indexOf('-- This sample')))
  await db.exec(readFileSync('supabase/sql/24-common-decorations/01-common-decorations.sql','utf8'))
  await db.exec(readFileSync('supabase/sql/27-new-decorations/01-new-decorations.sql','utf8'))
  await db.exec(readFileSync('supabase/sql/28-coastal-decorations/01-coastal-decorations.sql','utf8'))
  await db.exec("update public.collectible_species set rarity='rare',sell_price=160 where id='pearl-bearing-clam'")
  await db.exec(`create table public.player_collectibles(id text primary key,species_id text references public.collectible_species(id),position_x numeric,position_y numeric);
    insert into public.player_collectibles values ('old-item','pearl-bearing-clam',0.2,0.3);`)
  const seed=readFileSync('supabase/sql/29-statue-decorations/01-statue-decorations.sql','utf8')
  await db.exec(seed)
  await db.exec(`insert into public.player_collectibles values ('new-item','pongi-statue',0.7,0.8);`)
  await db.exec(seed)
  const {rows}=await db.query('select * from public.collectible_species where id=any($1) order by id',[ids])
  assert.equal(rows.length,4)
  assert.equal(rows.filter(row=>row.rarity==='epic').length,1)
  assert.equal(rows.filter(row=>row.rarity==='rare').length,3)
  for(const row of rows){
    assert.equal(row.kind,'decoration')
    assert.equal(Number(row.speed),0)
    assert.equal(row.swim_y_min,null)
    assert.equal(row.swim_y_max,null)
    assert.equal(row.sprite_sheet_path,null)
    assert.ok(row.size>=50&&row.size<=90)
    assert.ok(row.thumbnail_path.startsWith(`decorations/${row.rarity}/`))
    const png=readFileSync(`assets/storage-upload/new/${row.thumbnail_path.split('/').at(-1)}`)
    assert.equal(png.subarray(1,4).toString(),'PNG')
    assert.equal(png[25],6,'Expected RGBA PNG')
  }
  const habitats=await db.query('select species_id,count(*)::int as count from public.collectible_habitats where species_id=any($1) group by species_id',[ids])
  assert.equal(habitats.rows.length,4)
  for(const row of habitats.rows)assert.equal(row.count,5)
  const clam=await db.query("select rarity,sell_price,thumbnail_path from public.collectible_species where id='pearl-bearing-clam'")
  assert.deepEqual(clam.rows,[{rarity:'common',sell_price:45,thumbnail_path:'decorations/rare/pearl-bearing-clam_thumbnail.png'}])
  const owned=await db.query('select id,position_x::float as x,position_y::float as y from public.player_collectibles order by id')
  assert.deepEqual(owned.rows,[{id:'new-item',x:0.7,y:0.8},{id:'old-item',x:0.2,y:0.3}])
  await assert.rejects(db.exec(`insert into public.collectible_species(id,kind,name,description,speed,size,rarity,thumbnail_path,sell_price)
    values ('bad-trash','trash','x','x',0,50,'rare','x.png',1);`),/collectible_nonfish_common/)
  console.log('PASS: 4 decorations (3 rare, 1 epic), 20 habitats, clam downgraded to common, RGBA assets; repeat seed preserves ownership/positions and trash rarity constraint.')
}finally{await db.close()}
