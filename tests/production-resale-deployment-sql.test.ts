// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'

it('restores the deployed pre-resale functions without changing owned sites or issuing duplicate refunds',async()=>{
 const db=await createLocalDatabase()
 const migration='20261022144034_restore_production_resale.sql'
 const user='00000000-0000-0000-0000-000000000895'
 let legacy:string[]=[]
 try{
  for(const file of migrationFiles().filter(f=>f<migration)){
   await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
   if(file==='20261022041313_production_multiple_sites.sql'){
    legacy=(await db.query<{definition:string}>(`select pg_get_functiondef(oid) definition from pg_proc
     where oid in ('app_private.production_apply(text,uuid,text,jsonb,boolean)'::regprocedure,
      'app_private.production_purchase(text,integer,uuid)'::regprocedure)`)).rows.map(r=>r.definition)
   }
  }
  expect(legacy).toHaveLength(2)
  await db.exec(legacy.join(';'))
  expect((await db.query<{hash:string}>("select md5(prosrc) hash from pg_proc where oid='app_private.production_apply(text,uuid,text,jsonb,boolean)'::regprocedure")).rows[0].hash).toBe('11323f29b30fa76309d87242df2a3dbf')
  await db.exec('update app_private.fishing_maintenance set released_at=starts_at')
  await db.query('insert into auth.users(id) values($1)',[user])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{}') on conflict(user_id) do update set gold=10000,inventory='{}'",[user])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
  await db.exec('set role authenticated')
  const bought=(await db.query<{r:any}>("select public.production_action('buy',$1,'shell-coal-mini-kiln') r",[crypto.randomUUID()])).rows[0].r
  const site=bought.sites[0].siteId,op=crypto.randomUUID()
  await expect(db.query("select public.production_action('sell',$1,$2)",[op,site])).rejects.toThrow(/INVALID_PRODUCTION/)
  await db.exec('reset role')
  const before=(await db.query('select to_jsonb(s) snapshot from app_private.production_sites s where id=$1',[site])).rows[0]
  await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'))
  expect((await db.query('select to_jsonb(s) snapshot from app_private.production_sites s where id=$1',[site])).rows[0]).toEqual(before)
  await db.exec('set role authenticated')
  for(let i=0;i<2;i++){
   const sold=(await db.query<{r:any}>("select public.production_action('sell',$1,$2) r",[op,site])).rows[0].r
   expect(sold.gold).toBe(bought.gold+175)
   expect(sold.sites).toHaveLength(0)
  }
 }finally{await db.close()}
},60000)
