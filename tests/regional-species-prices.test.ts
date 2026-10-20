// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {catalogSql} from '../scripts/db/catalog.mjs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
// Minimal non-player fixture from the retained native species inspected in project
// ewafafphiovbpjwogwzn on 2026-10-20. It is not a complete remote schema snapshot.
const retained=JSON.parse(readFileSync('tests/fixtures/retained-native-species-prices.json','utf8'))
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.exec('begin')
 for(const s of retained){
  await db.query(`insert into public.collectible_species(id,name,description,size,kind,rarity,sell_price,native_region_id,thumbnail_path,sprite_sheet_path,swim_y_min,swim_y_max,speed)
  values($1,$1,'retained price fixture',32,$2,$3,$4,$5,'fixture.png','fixture-sprite.png',0.1,0.8,0.02)`,[s.id,s.kind,s.rarity,s.sell_price,s.native_region_id])
  await db.query('insert into public.collectible_habitats(species_id,region_id) values($1,$2)',[s.id,s.native_region_id])
 }
 await db.exec('commit')
 await db.exec(catalogSql(catalog,{tables:['collectible_species']}))
},60000)
afterAll(async()=>{await db?.close()})

it('increases native species mean values with map price across every available rarity',async()=>{
 const rows=(await db.query(`select s.native_region_id region,s.rarity,avg(s.sell_price)::float8 mean,m.price
 from public.collectible_species s join public.region_maps m on m.region_id=s.native_region_id
 where s.kind='fish' group by s.native_region_id,s.rarity,m.price order by m.price,s.native_region_id`)).rows
 for(const rarity of ['common','rare','epic','mythic']){
  const groups=rows.filter(r=>r.rarity===rarity)
  expect(groups.length).toBeGreaterThan(8)
  const levels=[0,...new Set(catalog.region_maps.map(m=>m.price))].sort((a,b)=>a-b)
  const rate=rarity==='epic'?0.04:rarity==='mythic'?0.03:0.05
  const bases=groups.map(g=>g.mean/(1+levels.indexOf(g.price)*rate))
  expect(Math.max(...bases)-Math.min(...bases)).toBeLessThan(1)
  for(let i=1;i<groups.length;i++){
   if(groups[i].price===groups[i-1].price)expect(Math.abs(groups[i].mean-groups[i-1].mean)).toBeLessThan(1)
   else expect(groups[i].mean).toBeGreaterThan(groups[i-1].mean)
  }
 }
})

it('keeps shared species, decorations and trash unchanged and never registers retained species',async()=>{
 const before=await db.query('select id,kind,native_region_id,sell_price from public.collectible_species order by id')
 const migration=readFileSync('supabase/migrations/20261020034706_regional_species_value_progression.sql','utf8')
 const changedIds=[...migration.matchAll(/\('([-a-z0-9]+)',\d+\)/g)].map(m=>m[1])
 expect(changedIds.length).toBeGreaterThan(100)
 for(const id of changedIds){
  const s=before.rows.find(s=>s.id===id)
  expect(s.kind).toBe('fish');expect(s.native_region_id).toBeTruthy();expect(s.native_region_id).not.toBe('pongdang')
 }
 await db.exec(catalogSql(catalog,{tables:['collectible_species']}))
 expect((await db.query('select id,kind,native_region_id,sell_price from public.collectible_species order by id')).rows).toEqual(before.rows)
 const absent=catalog.retained_species_prices[0]
 await db.exec('begin')
 try{
  await db.query('delete from public.collectible_habitats where species_id=$1',[absent.id])
  await db.query('delete from public.collectible_species where id=$1',[absent.id])
  // UPDATE-only overrides do not insert a missing retained species.
  const sql=catalogSql(catalog,{tables:['collectible_species']}).replace(/^begin;$/m,'').replace(/^commit;$/m,'')
  await db.exec(sql)
  expect((await db.query('select id from public.collectible_species where id=$1',[absent.id])).rows).toHaveLength(0)
 }finally{await db.exec('rollback')}
})

it('uses the new species price in the real sale RPC and credits a retry only once',async()=>{
 const uid='00000000-0000-0000-0000-000000003710',operation=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,100)',[uid])
 const species=catalog.collectible_species.find(s=>s.kind==='fish'&&s.native_region_id==='siren'&&s.rarity==='common')
 const fish=(await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[uid,species.id])).rows[0].id
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated')
 try{
  const sale=(await db.query('select public.sell_collectibles($1,$2) result',[[fish],operation])).rows[0].result
  expect(sale).toMatchObject({gold:100+species.sell_price,delta:species.sell_price})
  expect((await db.query('select public.sell_collectibles($1,$2) result',[[fish],operation])).rows[0].result).toMatchObject({gold:sale.gold,delta:0})
 }finally{await db.exec('reset role')}
})
