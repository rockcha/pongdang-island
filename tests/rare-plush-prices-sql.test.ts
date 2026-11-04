// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations,readSql} from '../scripts/db/local.mjs'
const prices={'bukangi-shark-plush':80,'dolphin-plush':80,'flattened-otter-plush':60,'flower-crab-plush':70,'jellyfish-plush':70,'octopus-plush':80,'pongi-plush':80,'turtle-plush':70,'unstuffed-seahorse-plush':65,'whale-plush':80,'worn-seal-plush':70}
const sql=readSql('supabase/migrations/20261104114551_buff_rare_plush_sell_prices.sql').split('\n').filter(line=>!/^(begin|commit);$/i.test(line.trim())).join('\n')
let db:any
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('sets the exact +40 plush prices and excludes the duck and unrelated dolls',async()=>{
 const rows=(await db.query('select id,sell_price from public.collectible_species where id=any($1)',[Object.keys(prices)])).rows
 expect(Object.fromEntries(rows.map((row:any)=>[row.id,row.sell_price]))).toEqual(prices)
 expect((await db.query("select sell_price from public.collectible_species where id='scrap-soaked-duck-toy'")).rows[0].sell_price).toBe(13)
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 for(const id of ['halloween-returned-cursed-doll','mechsanctum-praying-automaton']){
  const expected=catalog.collectible_species.find((row:any)=>row.id===id)
  expect((await db.query('select sell_price from public.collectible_species where id=$1',[id])).rows[0].sell_price).toBe(expected.sell_price)
 }
})
it('does not compound prices, recreate absent species or alter ownership and wallets',async()=>{
 await db.exec('begin')
 try{
  const uid=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.player_wallets(user_id,gold) values($1,123)',[uid]);await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'pongi-plush')",[uid])
  const owned=(await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows
  const absent=['flower-crab-plush','jellyfish-plush','turtle-plush']
  await db.query('delete from public.collectible_species where id=any($1)',[absent])
  await db.exec(sql);await db.exec(sql)
  expect((await db.query('select count(*)::integer count from public.collectible_species where id=any($1)',[absent])).rows[0].count).toBe(0)
  expect((await db.query("select sell_price from public.collectible_species where id='pongi-plush'")).rows[0].sell_price).toBe(80)
  expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toEqual(owned)
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(123)
 }finally{await db.exec('rollback')}
})
