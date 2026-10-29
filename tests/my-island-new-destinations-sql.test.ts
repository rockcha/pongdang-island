// @vitest-environment node
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'

it('adds new navigation facilities without changing existing layouts or charging gold',async()=>{
 const db=await createLocalDatabase(),file='20261028120157_island_market_and_item_archive.sql'
 try{
  for(const f of migrationFiles().filter(f=>f<file))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
  const uid=crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.query('insert into public.player_wallets(user_id,gold) values($1,4321)',[uid])
  const state=async()=>(await db.query('select public.my_island_state() s')).rows[0].s
  const before=await state()
  await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  const after=await state()
  expect(after.document).toEqual(before.document)
  expect(after.items).toEqual(before.items)
  expect(after.stocks).toEqual(before.stocks)
  expect(after.revision).toBe(before.revision)
  const additions=[{id:'portal~owned:page:/flea-market',x:25,y:16},{id:'portal~owned:page:/item-collection',x:31,y:23}]
  for(const p of additions)expect(after.catalog.find((f:{id:string})=>f.id===p.id)).toMatchObject({family:'facility',price:0})
  const document=structuredClone(after.document)
  document.layout.push(...additions)
  await db.exec('set role authenticated')
  await db.query('select public.save_my_island($1,$2,$3)',[document,after.revision,crypto.randomUUID()])
  await db.exec('reset role')
  expect((await state()).document.layout).toEqual(expect.arrayContaining(additions))
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(4321)
  const fresh=crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1)',[fresh])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[fresh])
  expect((await state()).document.layout).toEqual(expect.arrayContaining(additions))
 }finally{await db.close()}
},60000)
