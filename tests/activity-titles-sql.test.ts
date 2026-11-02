// @vitest-environment node
import {beforeAll,beforeEach,afterAll,afterEach,it,expect} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
import catalog from '../supabase/catalog/catalog.json'
let db:any,uid:string
const historical=crypto.randomUUID(),migration='20261102021029_extend_activity_titles.sql'
async function user(sql:string,args:unknown[]=[]){await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);await db.exec('set role authenticated');const r=await db.query(sql,args);await db.exec('reset role');return r.rows[0]?.s}
const progress=async(metric:string)=> (await db.query('select value::text,active_days from app_private.title_activity_progress where user_id=$1 and metric=$2',[uid,'activity_'+metric])).rows[0]
async function fuel(amount:number,action='claim',op=crypto.randomUUID(),owner=uid){await db.query('insert into app_private.production_operations(user_id,operation_id,signature,receipt) values($1,$2,$3,$4) on conflict do nothing',[owner,op,{action},{action,fuel:amount}])}
beforeAll(async()=>{
 db=await createLocalDatabase();for(const f of migrationFiles().filter(f=>f!==migration))await db.exec(readSql('supabase/migrations/'+f))
 await db.query('insert into auth.users(id) values($1)',[historical]);await db.query("insert into public.player_profiles(id,nickname) values($1,'과거활동검증')",[historical])
 await fuel(20,'claim',crypto.randomUUID(),historical);await fuel(20,'bulk_claim',crypto.randomUUID(),historical)
 await db.query('insert into app_private.bait_production_operations(user_id,operation_id,signature,receipt) values($1,$2,$3,$4)',[historical,crypto.randomUUID(),{action:'claim'},{action:'claim',count:40}])
 await db.exec(readSql('supabase/migrations/'+migration))
},60000)
beforeEach(async()=>{await db.exec('begin');uid=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[uid]);await db.query("insert into public.player_profiles(id,nickname) values($1,'활동검증')",[uid]);await db.query('delete from app_private.title_dirty where user_id=$1',[uid])})
afterEach(async()=>{await db.exec('rollback;reset role')});afterAll(async()=>{await db?.close()})
it('adds exactly thirty titles across live activity families and makes new mythics long-term compound goals',()=>{
 const titles=catalog.title_catalog.filter(t=>t.id.startsWith('activity-'))
 expect(titles).toHaveLength(30);expect(new Set(titles.map(t=>t.name)).size).toBe(30)
 for(const domain of ['exploration','savings','fuel','bait','flea'])expect(titles.filter(t=>t.metric==='activity_'+domain)).toHaveLength(6)
 const mythics=titles.filter(t=>t.tier===4);expect(mythics).toHaveLength(5)
 expect(mythics.every(t=>t.extra_metric===t.metric+'_days'&&t.extra_target!>=60)).toBe(true)
})
it('backfills verified quantities without inventing historical bait claim dates or double counting bulk fuel summaries',async()=>{
 uid=historical
 expect(await progress('fuel')).toEqual({value:'20',active_days:1})
 expect(await progress('bait')).toEqual({value:'40',active_days:0})
})
it('increments once per completed claim and queues only newly crossed milestones',async()=>{
 await fuel(9)
 expect(await progress('fuel')).toEqual({value:'9',active_days:1})
 expect((await db.query('select * from app_private.title_dirty where user_id=$1',[uid])).rows).toHaveLength(0)
 const op=crypto.randomUUID();await fuel(1,'claim',op);await fuel(1,'claim',op)
 await fuel(1000,'discard');await fuel(1000,'bulk_claim')
 expect(await progress('fuel')).toEqual({value:'10',active_days:1})
 expect((await db.query('select * from app_private.title_dirty where user_id=$1',[uid])).rows).toHaveLength(1)
 const state=await user('select public.title_state() s')
 expect(state.titles.find(t=>t.id==='activity-fuel-1').earnedAt).toBeTruthy()
 const notifications=(await db.query('select count(*)::int n from public.notifications where recipient_id=$1',[uid])).rows[0].n
 // A repeated screen read must not run the legacy history aggregators.
 await db.exec("create or replace function app_private.title_metrics(p_user uuid) returns jsonb language plpgsql as $$begin raise exception 'UNEXPECTED_HISTORY_SCAN';end$$")
 await user('select public.title_state() s');await user('select public.equip_title($1) s',['activity-fuel-1'])
 expect((await db.query('select count(*)::int n from public.notifications where recipient_id=$1',[uid])).rows[0].n).toBe(notifications)
})
it('requires activity days as well as a large total, deduplicates Korean dates and handles out-of-order events',async()=>{
 await db.query("select app_private.record_title_activity($1,'activity_flea',5000000,'2026-01-01T14:59:59Z')",[uid])
 let state=await user('select public.title_state() s')
 expect(state.titles.find(t=>t.id==='activity-flea-6')).toMatchObject({earnedAt:null,description:null,target:null,progress:null,extra_target:null})
 await db.query("select app_private.record_title_activity($1,'activity_flea',1,'2026-01-01T15:00:00Z')",[uid])
 await db.query("select app_private.record_title_activity($1,'activity_flea',1,'2026-01-01T12:00:00Z')",[uid])
 expect((await progress('flea')).active_days).toBe(2)
 for(let day=2;day<120;day++)await db.query("select app_private.record_title_activity($1,'activity_flea',1,'2026-01-01T00:00:00Z'::timestamptz+make_interval(days=>$2))",[uid,day])
 state=await user('select public.title_state() s');expect(state.titles.find(t=>t.id==='activity-flea-6').earnedAt).toBeTruthy()
})
it('counts sellers from trade snapshots, excludes buyers, cancellations and self-dealing',async()=>{
 const buyer=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[buyer])
 const line=crypto.randomUUID(),request={action:'trade',items:[{id:line,quantity:2}]},result={side:'sell',owner_id:uid,items:[{id:line,unit_price:1000}]}
 const insert=async(actor:string,request:any,result:any)=>db.query('insert into app_private.flea_receipts(user_id,operation_id,request,result) values($1,$2,$3,$4)',[actor,crypto.randomUUID(),request,result])
 await insert(buyer,request,result);expect(await progress('flea')).toEqual({value:'2000',active_days:1})
 expect((await db.query("select * from app_private.title_activity_progress where user_id=$1 and metric='activity_flea'",[buyer])).rows).toHaveLength(0)
 await insert(uid,{...request,action:'close'},result);await insert(uid,request,result)
 expect((await progress('flea')).value).toBe('2000')
 await insert(uid,request,{...result,side:'buy',owner_id:buyer});expect((await progress('flea')).value).toBe('4000')
})
it('counts successful exploration and matured savings transitions once, and includes automatic production',async()=>{
 const run=crypto.randomUUID();await db.query("insert into app_private.exploration_runs(id,user_id,model) values($1,$2,'{}')",[run,uid])
 await db.query('update app_private.exploration_runs set finished_at=now(),reward_gold=2000 where id=$1',[run]);await db.query('update app_private.exploration_runs set finished_at=now() where id=$1',[run])
 expect((await progress('exploration')).value).toBe('1')
 const bank=(await db.query('insert into public.shell_savings(user_id,term_days,daily_amount,paid_count) values($1,3,10,3) returning id',[uid])).rows[0].id
 await db.query("update public.shell_savings set closed_at=now(),close_kind='cancelled',payout=30 where id=$1",[bank]);expect(await progress('savings')).toBeUndefined()
 const bank2=(await db.query('insert into public.shell_savings(user_id,term_days,daily_amount,paid_count) values($1,3,10,3) returning id',[uid])).rows[0].id
 await db.query("update public.shell_savings set closed_at=now(),close_kind='matured',payout=36 where id=$1",[bank2]);await db.query('update public.shell_savings set closed_at=now() where id=$1',[bank2])
 expect((await progress('savings')).value).toBe('1')
 const site=crypto.randomUUID();for(let i=0;i<2;i++)await db.query("insert into app_private.production_auto_claims(user_id,kind,site_id,started_at,completed_at,claimed_at,item_id,amount,relic_id) values($1,'bait',$2,'2026-01-01','2026-01-02','2026-01-03','bait',3,'sleepless-harvest-bell') on conflict do nothing",[uid,site])
 expect(await progress('bait')).toEqual({value:'3',active_days:1})
})
it('blocks direct progress access, forged increments and cross-account metrics',async()=>{
 await db.exec('savepoint denied;set role authenticated')
 await expect(db.query("select app_private.record_title_activity($1,'activity_fuel',50000,now())",[uid])).rejects.toThrow('permission denied')
 await db.exec('rollback to denied;reset role;release savepoint denied')
 for(const table of ['title_activity_progress','title_activity_days'])expect((await db.query("select has_table_privilege('authenticated',$1,'SELECT') r,has_table_privilege('authenticated',$1,'UPDATE') w",['app_private.'+table])).rows[0]).toEqual({r:false,w:false})
})
