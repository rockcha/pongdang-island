// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {catalogSql} from '../scripts/db/catalog.mjs'
import {readFileSync} from 'node:fs'
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const baits=catalog.fishing_baits.filter(b=>b.fish_only)
const uid='00000000-0000-0000-0000-000000005601'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec("select app_private.get_gold_wallet();insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang')")
 await db.query('update public.player_wallets set gold=10000,inventory=$1 where user_id=$2',[JSON.stringify(Object.fromEntries(baits.map(b=>[b.id,100]))),uid])
},60000)
afterAll(async()=>await db?.close())

it('sells all ten at the approved price and keeps success fixed despite rod and trap bonuses',async()=>{
 expect(baits).toHaveLength(10)
 await db.exec('select public.fishing_rod_state()')
 await db.query("insert into public.player_fishing_rods(user_id,rod_id) values($1,'calm')",[uid])
 await db.query("select public.equip_fishing_rod('calm')")
 for(const b of baits){
  const id=crypto.randomUUID()
  await db.query('select public.buy_fishing_bait($1,$2)',[b.id,id]);await db.query('select public.buy_fishing_bait($1,$2)',[b.id,id])
  expect((await db.query('select delta from public.gold_transactions where operation_id=$1',[id])).rows).toEqual([{delta:-b.price}])
  expect((await db.query('select app_private.manual_fishing_success_chance_bp($1) manual,app_private.expedition_success_chance_bp($1,3000) trap',[b.id])).rows[0]).toEqual({manual:b.success_chance_bp,trap:b.success_chance_bp})
 }
})

it('exhaustively resolves all 10,000 grade rolls with exact conditional probabilities',async()=>{
 for(const b of baits.filter(b=>!b.alternating)){
  const rows=(await db.query("select app_private.resolve_regional_fishing($1,'pongdang',n) rarity,count(*)::int n from generate_series(0,9999)n group by rarity",[b.id])).rows
  for(const grade of ['common','rare','epic','mythic'])expect(rows.find(r=>r.rarity===grade)?.n??0).toBe(b[grade+'_bp'])
 }
},30000)

it('keeps fish-only pools strict in manual and trap draws',async()=>{
 for(const b of baits){
  const rows=(await db.query("with draws as materialized(select app_private.expedition_pick('pongdang',$1,false) id from generate_series(1,100)) select kind,rarity from draws d join public.collectible_species s on s.id=d.id",[b.id])).rows
  expect(rows).toHaveLength(100)
  for(const row of rows){expect(row.kind).toBe('fish');expect(b.alternating?['common','rare']:['common','rare','epic','mythic'].filter(r=>b[r+'_bp']>0)).toContain(row.rarity)}
 }
})

it('advances jelly on failed casts, persists across state reloads, and never advances on retry or invalid input',async()=>{
 await db.exec('delete from app_private.bait_cycles')
 const read=async()=>(await db.query('select public.fishing_state() s')).rows[0].s.baits.find(b=>b.alternating)
 expect((await read()).nextRarity).toBe('common')
 for(const grade of ['common','rare','common','rare']){
  const id=crypto.randomUUID()
  await db.exec('set role authenticated')
  let first
  try{
   first=(await db.query("select public.prepare_fishing('pongdang','bait_zigzag_jelly',$1) p",[id])).rows[0].p
   expect((await db.query("select public.prepare_fishing('pongdang','bait_zigzag_jelly',$1) p",[id])).rows[0].p).toEqual(first)
   expect(first.rarity).toBe(grade)
   expect((await read()).nextRarity).toBe(grade==='common'?'rare':'common')
   await db.query('select public.finish_fishing($1,false)',[id])
   await db.query('select public.finish_fishing($1,false)',[id])
   expect((await read()).nextRarity).toBe(grade==='common'?'rare':'common')
  }finally{await db.exec('reset role')}
 }
 const before=await read()
 await expect(db.query("select public.prepare_fishing('missing','bait_zigzag_jelly',$1)",[crypto.randomUUID()])).rejects.toThrow(/REGION_NOT_FOUND/)
 expect(await read()).toEqual(before)
 const state=(await db.query('select public.fishing_rod_state() s')).rows[0].s
 expect(state.baits.find(b=>b.alternating).nextRarity).toBe(before.nextRarity)
 expect((await db.query("select has_function_privilege('authenticated','app_private.consume_bait_cycle()','execute') allowed")).rows[0].allowed).toBe(false)
 await db.exec('set role authenticated')
 try{await expect(db.query('select * from app_private.bait_cycles')).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
})

it('keeps the two cheap decorations and existing ownership while scoping catalog writes',async()=>{
 expect((await db.query("select id,kind,sell_price,speed::float8 speed from public.collectible_species where id in ('cracked-perfume-vial','siren-cracked-idol') order by id")).rows).toEqual([{id:'cracked-perfume-vial',kind:'decoration',sell_price:10,speed:0},{id:'siren-cracked-idol',kind:'decoration',sell_price:15,speed:0}])
 const item=(await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'siren-cracked-idol') returning id",[uid])).rows[0].id
 const sql=catalogSql(catalog,{tables:['collectible_species'],ids:['siren-cracked-idol']})
 expect(sql).not.toContain('cracked-perfume-vial');expect(sql).not.toContain('public.fishing_baits');expect(sql).not.toContain('delete from public.collectible_species')
 await db.exec(sql)
 expect((await db.query('select species_id from public.player_collectibles where id=$1',[item])).rows[0].species_id).toBe('siren-cracked-idol')
 expect(()=>catalogSql(catalog,{tables:['collectible_species'],ids:['missing']})).toThrow(/Unknown scoped/)
})
