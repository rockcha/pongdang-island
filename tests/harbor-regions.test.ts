// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations,migrationFiles,readSql} from '../scripts/db/local.mjs'
let db
const uid='00000000-0000-0000-0000-000000000971'
async function action(action,region='pongdang',op=crypto.randomUUID()){
 return (await db.query("select public.harbor_action($1,$2,'fishing-raft',null,1,null,null,$3) s",[action,op,region])).rows[0].s
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
beforeEach(async()=>{
 await db.exec('begin')
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{\"fuel\":10}') on conflict(user_id) do update set gold=10000,inventory=excluded.inventory",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await action('buy')
})
afterEach(async()=>{await db.exec('rollback')})
afterAll(async()=>{await db?.close()})
async function rejected(sql,args,message){await db.exec('savepoint attempt');await expect(db.query(sql,args)).rejects.toThrow(message);await db.exec('rollback to savepoint attempt;release savepoint attempt')}
it('rejects locked and invalid destinations without consuming fuel or creating a voyage',async()=>{
 for(const [region,error]of [['coral','REGION_LOCKED'],['missing','REGION_NOT_FOUND'],[null,'REGION_NOT_FOUND']])
  await rejected("select public.harbor_action('depart',$1,'fishing-raft',null,1,null,null,$2)",[crypto.randomUUID(),region],error)
 expect((await db.query('select count(*)::int n from public.harbor_voyages')).rows[0].n).toBe(0)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[uid])).rows[0].inventory.fuel).toBe(10)
})
it('captures an unlocked destination, rejects destination changes on retry and returns it with the voyage',async()=>{
 await db.query("insert into public.player_map_fragments(user_id,region_id) values($1,'coral')",[uid])
 const op=crypto.randomUUID(),s=await action('depart','coral',op)
 expect(s.voyages[0]).toMatchObject({region_id:'coral',region_name:'산호빛 여울'})
 expect(s.regions.find(r=>r.id==='coral').unlocked).toBe(true)
 expect(s.regions.find(r=>r.id==='dreamabyss').unlocked).toBe(false)
 expect((await action('depart','coral',op)).replayed).toBe(true)
 await rejected("select public.harbor_action('depart',$1,'fishing-raft',null,1,null,null,'pongdang')",[op],'OPERATION_CONFLICT')
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[uid])).rows[0].inventory.fuel).toBe(10)
})
it('draws from the stored sea with normal bait and no rod effects, independently of current navigation',async()=>{
 await db.query("insert into public.player_map_fragments(user_id,region_id) values($1,'coral')",[uid])
 await action('depart','coral')
 await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id='pongdang'",[uid])
 await db.exec(`
 create or replace function app_private.expedition_pick(p_region text,p_bait text,p_native boolean,p_local_discovery boolean default false) returns text language plpgsql set search_path='' as $$
 begin
  if p_region<>'coral' or p_bait<>'bait' or p_native or p_local_discovery then raise exception 'WRONG_DRAW_PARAMETERS';end if;
  return 'coral-bean-shrimp';
 end $$;
 create or replace function app_private.fishing_success_chance_bp(p_bait_id text) returns integer language sql as $$select 10000$$;
 create or replace function app_private.manual_fishing_success_chance_bp(p_bait_id text) returns integer language plpgsql as $$begin raise exception 'ROD_MUST_NOT_APPLY';end$$;
 update public.harbor_voyages set departed_at=clock_timestamp()-interval '1 hour',returns_at=clock_timestamp()-interval '1 second';
 `)
 const op=crypto.randomUUID(),s=await action('claim_all','pongdang',op),result=s.receipt.results[0]
 expect(result).toMatchObject({regionId:'coral',regionName:'산호빛 여울',attempted:2,succeeded:2})
 expect(result.items.map(i=>i.species.id)).toEqual(['coral-bean-shrimp','coral-bean-shrimp'])
 expect((await action('claim_all','pongdang',op)).receipt).toEqual(s.receipt)
})
it('preserves existing voyages and pending departure receipts through the signature migration',async()=>{
 const old=await createLocalDatabase()
 try{
  const latest='20261019110723_harbor_voyage_regions.sql'
  for(const file of migrationFiles()){if(file===latest)break;await old.exec(readSql('supabase/migrations/'+file))}
  await old.query('insert into auth.users(id) values($1)',[uid])
  await old.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await old.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{\"fuel\":10}') on conflict(user_id) do update set gold=10000,inventory=excluded.inventory",[uid])
  await old.exec("select public.harbor_action('buy',gen_random_uuid(),'fishing-raft')")
  const op=crypto.randomUUID(),before=(await old.query("select public.harbor_action('depart',$1,'fishing-raft') s",[op])).rows[0].s
  await old.exec(readSql('supabase/migrations/'+latest))
  await old.exec('set role authenticated')
  const after=(await old.query("select public.harbor_action('depart',$1,'fishing-raft') s",[op])).rows[0].s
  expect(after.replayed).toBe(true)
  expect(after.voyages[0]).toMatchObject({...before.voyages[0],region_id:'pongdang'})
  expect(after.fuel).toBe(before.fuel)
 }finally{await old.close()}
},60000)
