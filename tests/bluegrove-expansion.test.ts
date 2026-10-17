// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import plan from '../artifacts/bluegrove-expansion-plan.json'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
const sql=readFileSync('supabase/migrations/20261017005949_bluegrove_large_species.sql','utf8')
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('registers the requested rarities and scopes, including distinct seabass species',async()=>{
 for(const s of plan){
  const row=(await db.query('select name,rarity,kind,native_region_id from public.collectible_species where id=$1',[s.id])).rows[0]
  expect(row).toMatchObject({name:s.name,rarity:s.rarity,kind:'kind' in s?s.kind:'fish',native_region_id:s.scope==='shared'?null:'bluegrove'})
  const habitats=(await db.query('select region_id from public.collectible_habitats where species_id=$1 order by region_id',[s.id])).rows.map((r:{region_id:string})=>r.region_id)
  expect(habitats).toEqual(s.scope==='shared'?['bluegrove','coral','dreamabyss','mistmoon','pongdang','starruins','whitenight']:['bluegrove'])
 }
 expect(plan).toHaveLength(22)
})
it('keeps player holdings and wallets when the registration is run again',async()=>{
 const uid='00000000-0000-0000-0000-000000009534'
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,777)',[uid])
 await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'pinkchin-blenny')",[uid])
 const before=(await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows
 await db.exec(sql)
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toEqual(before)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(777)
})
it('keeps the sentinel fixed and registers only static decoration thumbnails',async()=>{
 expect((await db.query("select movement_type,flip_with_direction,sprite_sheet_path from public.collectible_species where id='atlantean-sentinel'")).rows[0]).toMatchObject({movement_type:'fixed',flip_with_direction:false,sprite_sheet_path:'fish/mythic/atlantean-sentinel-standing_sprite.png'})
 for(const s of plan.filter(s=>'kind' in s))expect((await db.query('select movement_type,sprite_sheet_path from public.collectible_species where id=$1',[s.id])).rows[0]).toEqual({movement_type:'fixed',sprite_sheet_path:null})
})
it('ships the PNG files referenced by every new collectible',()=>{
 for(const s of plan){
  const folder=s.rarity==='common'?'normal':s.rarity
  const prefix=`assets/storage-upload/new/20261017-095349/${'kind' in s?'decorations':'fish'}/${folder}/${s.id}`
  expect(existsSync(prefix+'_thumbnail.png')).toBe(true)
  if(!('kind' in s)){
   const png=readFileSync(prefix+'_sprite.png'),w=png.readUInt32BE(16),h=png.readUInt32BE(20)
   expect(w/(s.rarity==='mythic'?4:2)).toBe(h/2)
  }
 }
})
