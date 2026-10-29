// @vitest-environment node
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'

it('adds missing navigation facilities while preserving edited islands and remote-specific starter coordinates',async()=>{
 const db=await createLocalDatabase(),file='20261029063442_island_voyage_and_fishing_records.sql'
 try{
  for(const f of migrationFiles().filter(f=>f<file))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
  const uid=crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  const state=async()=>(await db.query('select public.my_island_state() s')).rows[0].s
  const before=await state()
  const starter=(await db.query("select blueprint from public.island_starters where id='default'")).rows[0].blueprint
  const safe=starter.document.layout.find((p:any)=>p.id==='shell-safe~owned:hub')
  safe.x=31;safe.y=13
  await db.query("update public.island_starters set blueprint=$1 where id='default'",[JSON.stringify(starter)])
  await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  const after=await state()
  expect(after.document).toEqual(before.document);expect(after.revision).toBe(before.revision)
  const updated=(await db.query("select blueprint from public.island_starters where id='default'")).rows[0].blueprint
  expect(updated.document.layout.find((p:any)=>p.id===safe.id)).toEqual(safe)
  for(const path of ['/voyage-bets','/fishing-records','/flea-market','/item-collection']){
   const id='portal~owned:page:'+path
   expect(updated.document.layout.filter((p:any)=>p.id===id)).toHaveLength(1)
   expect(after.catalog.find((p:any)=>p.id===id)).toMatchObject({family:'facility',price:0})
  }
  await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  expect((await db.query("select blueprint from public.island_starters where id='default'")).rows[0].blueprint).toEqual(updated)
 }finally{await db.close()}
},60000)
