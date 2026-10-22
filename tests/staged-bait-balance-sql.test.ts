// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'
import {catalogSql} from '../scripts/db/catalog.mjs'

const schemaMigration='20261022073838_staged_fishing_bait_balance.sql'
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
let db:any,activeBefore:any,functionsBefore:any,maintenanceBefore:any
const activeFunctions=()=>db.query("select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) signature,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','app_private') and p.proname in ('prepare_fishing','finish_fishing','fishing_state','fishing_success_chance_bp','expedition_pick','settle_legacy_harbor') order by 1,2,3")
beforeAll(async()=>{
 db=await createLocalDatabase()
 for(const file of migrationFiles().filter(f=>f<schemaMigration))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
 activeBefore=(await db.query('select * from public.fishing_baits order by id')).rows
 functionsBefore=(await activeFunctions()).rows
 maintenanceBefore=(await db.query('select * from app_private.fishing_maintenance')).rows
 // This suite verifies the staging step before the later activation migration.
 for(const file of migrationFiles().filter(f=>f>=schemaMigration&&f<'20261022082534_activate_fishing_bait_mechanics.sql'))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
},60000)
afterAll(async()=>{await db?.close()})

it('stores all 27 profiles with the agreed new bait, aurora target and lightning settings',async()=>{
 const rows=(await db.query('select * from app_private.fishing_bait_balance_profiles order by id')).rows.map((r:any)=>({...r,native_multiplier:Number(r.native_multiplier)}))
 // Current catalog values may have later balance patches; verify this historical
 // staging step's IDs here and its original balance/clock boundaries below.
 expect(rows.map((r:any)=>r.id).sort()).toEqual(catalog.fishing_bait_balance_profiles.map((b:any)=>b.id).sort())
 expect(rows).toHaveLength(27)
 expect(rows.every((r:any)=>r.success_chance_bp===10000)).toBe(true)
 expect(rows.find((r:any)=>r.id==='bait_deep_sleep_sachet')).toMatchObject({name:'깊은잠 향낭',price:380,common_bp:0,rare_bp:8400,epic_bp:1500,mythic_bp:100,wait_min_seconds:70,wait_max_seconds:90,target_kinds:['fish','trash','decoration']})
 expect(rows.find((r:any)=>r.id==='bait_aurora_clockwork_bug')).toMatchObject({target_kinds:['fish','decoration']})
 expect(rows.find((r:any)=>r.id==='bait_lightning_stardust')).toMatchObject({price:300,common_bp:0,rare_bp:8000,epic_bp:2000,mythic_bp:0})
 expect(rows.filter((r:any)=>r.price===null).map((r:any)=>r.id).sort()).toEqual(['bait_epic','bait_first_greeting','bait_special'])
})

it.each([
 ['2026-10-22T05:59:59+09:00','night',4500,5500,22,26],
 ['2026-10-22T06:00:00+09:00','day',5500,4500,18,22],
 ['2026-10-22T17:59:59+09:00','day',5500,4500,18,22],
 ['2026-10-22T18:00:00+09:00','night',4500,5500,22,26],
 ['2026-10-22T00:00:00+09:00','night',4500,5500,22,26],
 ['2026-10-21T21:00:00Z','day',5500,4500,18,22],
])('resolves moonshade from Korea time at %s',async(at,period,common,rare,min,max)=>{
 const {rule}=(await db.query("select app_private.fishing_bait_balance_at('bait_moonshade_dumpling',$1) rule",[at])).rows[0]
 expect(rule).toMatchObject({name:'달그늘 경단',price:130,period,common_bp:common,rare_bp:rare,epic_bp:0,mythic_bp:0,wait_min_seconds:min,wait_max_seconds:max,target_kinds:['fish','trash','decoration']})
 expect(rule.night_common_bp).toBeUndefined()
})

it('keeps the currently active baits, fishing functions and maintenance configuration unchanged',async()=>{
 expect((await db.query('select * from public.fishing_baits order by id')).rows).toEqual(activeBefore)
 expect((await activeFunctions()).rows).toEqual(functionsBefore)
 expect((await db.query('select * from app_private.fishing_maintenance')).rows).toEqual(maintenanceBefore)
 expect((await db.query("select app_private.fishing_maintenance_active('2026-10-22 16:00+09') active")).rows[0].active).toBe(true)
 expect((await db.query("select count(*)::integer n from public.fishing_baits where id in ('bait_moonshade_dumpling','bait_deep_sleep_sachet')")).rows[0].n).toBe(0)
})

it.each([
 "price=-1",
 "success_chance_bp=3500",
 "common_bp=0",
 "wait_max_seconds=0",
 "target_kinds='[\"map\"]'::jsonb",
 "target_kinds='[]'::jsonb",
 "night_common_bp=5000",
 "native_multiplier=3",
])('rejects invalid staged settings: %s',async(assignment)=>{
 await expect(db.exec("update app_private.fishing_bait_balance_profiles set "+assignment+" where id='bait'")).rejects.toThrow()
})

it('rejects partial night rules and invalid night grade totals',async()=>{
 await expect(db.exec("update app_private.fishing_bait_balance_profiles set night_wait_max_seconds=null where id='bait_moonshade_dumpling'")).rejects.toThrow()
 await expect(db.exec("update app_private.fishing_bait_balance_profiles set night_rare_bp=8000 where id='bait_moonshade_dumpling'")).rejects.toThrow()
 expect((await db.query("select app_private.fishing_bait_balance_at('unknown') rule")).rows[0].rule).toBeNull()
})

it('supports repeat deployment of only the staged catalog without touching active baits',async()=>{
 const sql=catalogSql(catalog,{tables:['fishing_bait_balance_profiles']})
 await db.exec(sql);await db.exec(sql)
 expect((await db.query('select * from public.fishing_baits order by id')).rows).toEqual(activeBefore)
 expect((await db.query('select count(*)::integer n from app_private.fishing_bait_balance_profiles')).rows[0].n).toBe(27)
})

it.each(['anon','authenticated'])('denies %s access to staged data, writes and the internal lookup',async(role)=>{
 await db.exec('set role '+role)
 try{
  await expect(db.query('select * from app_private.fishing_bait_balance_profiles')).rejects.toThrow(/permission denied/)
  await expect(db.query("update app_private.fishing_bait_balance_profiles set price=0")).rejects.toThrow(/permission denied/)
  await expect(db.query("select app_private.fishing_bait_balance_at('bait')")).rejects.toThrow(/permission denied/)
 }finally{await db.exec('reset role')}
})
