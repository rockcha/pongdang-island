// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,replayMigrations} from '../scripts/db/local.mjs'

let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})

it('applies all three tiers at departure with precise previews, unchanged fuel, retry safety and no trap bonus',async()=>{
 await db.exec('begin')
 try{await db.exec(readFileSync('tests/fixtures/harbor-duration-relic-smoke.sql','utf8'))}
 finally{await db.exec('rollback;reset role')}
})

it('preserves voyages that departed before the migration',async()=>{
 const old=await createLocalDatabase()
 try{
  const files=migrationFiles(),start=files.findIndex(f=>f.endsWith('_voyage_duration_relic_effect.sql'))
  for(const file of files.slice(0,start))await old.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  await old.exec('update app_private.fishing_maintenance set released_at=starts_at')
  const u=crypto.randomUUID()
  await old.query('insert into auth.users(id) values($1)',[u])
  await old.query("insert into public.player_profiles(id,nickname) values($1,'기존항해')",[u])
  await old.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{\"fuel\":100}') on conflict(user_id) do update set gold=10000,inventory=excluded.inventory",[u])
  await old.query("select set_config('request.jwt.claim.sub',$1,false)",[u])
  await old.query("select public.harbor_action('buy',$1,'tin-dinghy')",[crypto.randomUUID()])
  await old.query("select public.harbor_action('depart',$1,'tin-dinghy')",[crypto.randomUUID()])
  const before=(await old.query('select to_jsonb(v) trip from public.harbor_voyages v where user_id=$1',[u])).rows
  for(const file of files.slice(start))await old.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  expect((await old.query('select to_jsonb(v) trip from public.harbor_voyages v where user_id=$1',[u])).rows).toEqual(before)
 }finally{await old.close()}
},60000)
