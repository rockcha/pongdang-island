// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {dreamabyssFixedFrame} from '../src/features/aquarium/dreamabyss-animation'
const added=JSON.parse(readFileSync('assets/storage-upload/new/20261018-183000/catalog-entries.json','utf8'))
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('keeps trash sellable and rejects future zero-price trash',async()=>{
 const rows=(await db.query("select id,sell_price from public.collectible_species where id in ('cracked-pressure-gauge','dented-diving-lamp') order by id")).rows
 expect(rows).toEqual([{id:'cracked-pressure-gauge',sell_price:19},{id:'dented-diving-lamp',sell_price:19}])
 expect((await db.query("select id from public.collectible_species where kind='trash' and sell_price<=0")).rows).toHaveLength(0)
 await expect(db.query("update public.collectible_species set sell_price=0 where id='cracked-pressure-gauge'")).rejects.toThrow('collectible_species_trash_positive_sell_price')
})
it('sells the formerly zero-price items once for their combined price',async()=>{
 const user=crypto.randomUUID(),operation=crypto.randomUUID()
 await db.exec('begin')
 try{
  await db.query('insert into auth.users(id) values($1)',[user])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'가격확인')",[user])
  await db.query('insert into public.player_wallets(user_id,gold) values($1,100) on conflict(user_id) do update set gold=100',[user])
  const items=(await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'cracked-pressure-gauge'),($1,'dented-diving-lamp') returning id",[user])).rows.map(row=>row.id)
  await db.exec('set local role authenticated')
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user])
  const sell=()=>db.query('select public.sell_collectibles($1,$2) value',[items,operation])
  expect((await sell()).rows[0].value.delta).toBe(38)
  expect((await sell()).rows[0].value.delta).toBe(0)
  await db.exec('reset role')
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[user])).rows[0].gold).toBe(138)
 }finally{await db.exec('rollback')}
})
it('registers all selected species exclusively in dreamabyss with the requested fish grades',async()=>{
 expect(added.filter(s=>s.kind==='fish'&&s.rarity==='rare')).toHaveLength(5)
 expect(added.filter(s=>s.kind==='fish'&&s.rarity==='epic')).toHaveLength(4)
 expect(added.filter(s=>s.kind==='fish'&&s.rarity==='mythic')).toHaveLength(1)
 for(const s of added){
  const result=(await db.query('select s.kind,s.rarity,s.native_region_id,s.movement_type,s.sprite_sheet_path,array_agg(h.region_id) as habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=$1 group by s.id',[s.id])).rows[0]
  expect(result).toEqual({kind:s.kind,rarity:s.rarity,native_region_id:'dreamabyss',movement_type:s.kind==='fish'?'swim':'fixed',sprite_sheet_path:s.sprite_sheet_path,habitats:['dreamabyss']})
 }
})
it('allows fixed animated decorations while retaining sprite requirements for fish and static trash',async()=>{
 await expect(db.query("update public.collectible_species set sprite_sheet_path=null where id='violet-telescopefish'")).rejects.toThrow()
 await expect(db.query("update public.collectible_species set sprite_sheet_path='trash/invalid_sprite.png' where id='purple-stained-bottle'")).rejects.toThrow()
 const rows=(await db.query("select id from public.collectible_species where native_region_id='dreamabyss' and kind='decoration' and sprite_sheet_path is not null")).rows
 expect(rows.map(s=>s.id).sort()).toEqual(['moonlit-pearl-clam','primordial-amethyst-heart','violet-hydrothermal-vent'])
})
it('keeps animated decoration playback still during editing and reduced motion',()=>{
 for(const id of ['violet-hydrothermal-vent','moonlit-pearl-clam','primordial-amethyst-heart']){
  expect(dreamabyssFixedFrame(id,1)).toBe(1)
  expect(dreamabyssFixedFrame(id,1,true)).toBe(0)
  expect(dreamabyssFixedFrame(id,1,false,true)).toBe(0)
 }
 expect(dreamabyssFixedFrame('unrelated-species',1)).toBeNull()
})
