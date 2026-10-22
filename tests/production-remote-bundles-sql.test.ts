// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'
import {productionRemoteBundles,productionRemoteSql} from '../scripts/db/production-remote-sql.mjs'

it('executes the exact SQL Editor bundles and preserves literal regexes in recorded migrations',async()=>{
 const db=await createLocalDatabase()
 try{
  for(const file of migrationFiles().filter(f=>f<'20261022161705_bait_production_facilities.sql'))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  await db.exec('create schema if not exists supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])')
  for(const [out,files] of productionRemoteBundles){
   const sql=readFileSync('artifacts/'+out,'utf8')
   expect(sql).toBe(productionRemoteSql(files))
   await db.exec(sql)
   for(const file of files){
    const row=(await db.query<{statements:string[]}>('select statements from supabase_migrations.schema_migrations where version=$1',[file.slice(0,14)])).rows[0]
    expect(row.statements).toEqual([readFileSync('supabase/migrations/'+file,'utf8').replaceAll('\r\n','\n').trim()])
   }
  }
  expect((await db.query<{n:number}>('select count(*)::integer n from public.bait_production_facilities')).rows[0].n).toBe(14)
  expect((await db.query<{definition:string}>("select pg_get_functiondef('app_private.production_apply(text,uuid,text,jsonb,boolean)'::regprocedure) definition")).rows[0].definition).toContain('production_active_count()>=4')
 }finally{await db.close()}
},60000)
