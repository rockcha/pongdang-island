// @vitest-environment node
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db,successDefinition
const owner='00000000-0000-0000-0000-000000000701',other='00000000-0000-0000-0000-000000000702'
async function asUser(uid,sql,args=[]){await db.exec(uid?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,args)}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}}
async function action(kind,vessel=null,cargo=null,id=null,op=crypto.randomUUID(),uid=owner,region='pongdang'){return (await asUser(uid,'select public.expedition_action($1,$2,$3,$4,$5,$6) s',[kind,op,vessel,region,cargo,id])).rows[0].s}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);successDefinition=(await db.query("select pg_get_functiondef('app_private.fishing_success_chance_bp(text)'::regprocedure) d")).rows[0].d;for(const u of [owner,other]){await db.query('insert into auth.users(id) values($1)',[u]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[u,u===owner?'선장':'친구']);await db.query('insert into public.player_wallets(user_id,gold) values($1,50000) on conflict(user_id) do update set gold=excluded.gold',[u])}},60000)
beforeEach(async()=>{await db.exec(successDefinition);await db.exec(`truncate public.notifications,app_private.expedition_boosts,public.fishing_expeditions,public.player_fishing_vessels,app_private.expedition_operations;update public.player_wallets set gold=50000,inventory='{"bait":100,"bait_special":20}';update app_private.expedition_settings set instant_return_enabled=true`)})
afterAll(async()=>{await db?.close()})
it('enforces minimum, maximum, inventory, ownership and region access without consuming bait',async()=>{
 for(const cargo of [{bait:2},{bait:6},{unknown:3},{bait:-1},{bait:1.5}])await expect(action('depart','dinghy',cargo)).rejects.toThrow(/CARGO|BAIT/)
 await expect(action('depart','starlit',{bait:12})).rejects.toThrow(/NOT_OWNED/)
 await expect(action('depart','dinghy',{bait:3},null,crypto.randomUUID(),owner,'starruins')).rejects.toThrow(/REGION_LOCKED/)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[owner])).rows[0].inventory.bait).toBe(100)
})
it('reserves mixed cargo once, instantly returns and grants the reserved cargo only once without a starter bonus',async()=>{
 const op=crypto.randomUUID(),s=await action('depart','dinghy',{bait:2,bait_special:1},null,op),id=s.active.id
 expect((await action('depart','dinghy',{bait:2,bait_special:1},null,op)).replayed).toBe(true)
 await expect(action('depart','dinghy',{bait:3})).rejects.toThrow(/ACTIVE/)
 await expect(action('claim',null,null,id)).rejects.toThrow(/READY|TIME|RETURN|FINISHED/)
 await action('instant',null,null,id)
 const claim=await action('claim',null,null,id)
 expect(claim.active).toBeNull();expect(claim.receipt.result.attempted).toBe(3);expect(claim.receipt.result.items.length+claim.receipt.result.failed).toBe(3)
 expect(claim.receipt.result.items.filter(x=>x.bonus).length).toBe(0)
 await action('claim',null,null,id)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[owner])).rows[0].n).toBe(claim.receipt.result.items.length)
 const inv=(await db.query('select inventory from public.player_wallets where user_id=$1',[owner])).rows[0].inventory
 expect(inv.bait).toBe(98);expect(inv.bait_special).toBe(19)
})
it('purchases once and schedules the deep-sea ship for 24 hours',async()=>{
 await action('buy','starlit');await action('buy','starlit')
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0].gold).toBe(43500)
 const s=await action('depart','starlit',{bait:12})
 expect(Date.parse(s.active.returns_at)-Date.parse(s.active.departed_at)).toBeCloseTo(86400000,-2)
 await action('instant',null,null,s.active.id);const c=await action('claim',null,null,s.active.id)
 expect(c.receipt.result.attempted).toBe(18);expect(c.receipt.result.items.length+c.receipt.result.failed).toBe(18)
 for(const item of c.receipt.result.items.filter(x=>x.bonus))expect(['bait','bait_epic']).toContain(item.baitId)
})
it('isolates accounts, denies direct writes, and disables the temporary endpoint server-side',async()=>{
 const s=await action('depart','dinghy',{bait:3})
 await expect(action('instant',null,null,s.active.id,crypto.randomUUID(),other)).rejects.toThrow(/NOT_FOUND/)
 expect((await asUser(other,'select * from public.fishing_expeditions')).rows).toHaveLength(0)
 await expect(asUser(owner,"update public.fishing_expeditions set returns_at=now()")).rejects.toThrow(/permission denied/)
 await expect(asUser(null,'select public.expedition_state()')).rejects.toThrow(/permission denied/)
 await db.exec('update app_private.expedition_settings set instant_return_enabled=false')
 await expect(action('instant',null,null,s.active.id)).rejects.toThrow(/DISABLED/)
})
it('applies every vessel bonus and supports a fresh trip after collection',async()=>{
 const plans=(await db.query('select * from public.fishing_vessels order by sort_order')).rows
 for(const v of plans){
  await action('buy',v.id)
  const s=await action('depart',v.id,{bait:v.min_baits})
  await action('instant',null,null,s.active.id)
  const c=await action('claim',null,null,s.active.id),items=c.receipt.result.items
  const bonus=(v.bonus_kind==='per_ten'?Math.floor(v.min_baits/10):v.bonus_count)+v.bonus_basic_count
  expect(c.receipt.result.attempted).toBe(v.min_baits+bonus);expect(items.length+c.receipt.result.failed).toBe(v.min_baits+bonus)
  expect(items.filter(x=>x.bonus).length).toBeLessThanOrEqual(bonus)
  if(v.bonus_kind==='magnet')for(const item of items.filter(x=>x.bonus))expect(item.species.kind).toBe('decoration')
  if(v.bonus_kind==='special')for(const item of items.filter(x=>x.bonus))expect(['rare','epic','mythic']).toContain(item.species.rarity)
  await db.query(`update public.player_wallets set inventory='{"bait":100}' where user_id=$1`,[owner])
 }
})
it('consumes failed attempts including bonuses, stores the failure total, and never rerolls a retry',async()=>{
 await db.exec(successDefinition.replace(/AS \$function\$[\s\S]*?\$function\$/,()=> 'AS $function$ begin return 0; end; $function$'))
 const s=await action('depart','dinghy',{bait:3});await action('instant',null,null,s.active.id)
 const c=await action('claim',null,null,s.active.id)
 expect(c.receipt.result).toMatchObject({attempted:3,failed:3,succeeded:0,items:[]})
 expect((await action('claim',null,null,s.active.id)).receipt.result).toEqual(c.receipt.result)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[owner])).rows[0].inventory.bait).toBe(97)
})
it('keeps the safe bait guaranteed while applying the same success rule as direct fishing',async()=>{
 expect((await db.query("select app_private.fishing_success_chance_bp('bait') basic,app_private.fishing_success_chance_bp('bait_safe') safe")).rows[0]).toEqual({basic:4000,safe:10000})
 await db.query(`update public.player_wallets set inventory='{"bait_safe":3}' where user_id=$1`,[owner])
 const s=await action('depart','dinghy',{bait_safe:3});await action('instant',null,null,s.active.id)
 const c=await action('claim',null,null,s.active.id)
 expect(c.receipt.result.items.filter(x=>x.baitId==='bait_safe')).toHaveLength(3)
})
it('creates one persistent return notification without opening the expedition page and exposes it only to its owner',async()=>{
 const s=await action('depart','dinghy',{bait:3}),id=s.active.id
 expect((await db.query('select count(*)::int n from public.notifications where expedition_id=$1',[id])).rows[0].n).toBe(0)
 // Age through departed_at/returns_at trigger avoidance to exercise the scheduled sweep itself.
 await db.exec('alter table public.fishing_expeditions disable trigger expedition_return_notice')
 await db.query("update public.fishing_expeditions set returns_at=clock_timestamp()-interval '1 second' where id=$1",[id])
 await db.exec('alter table public.fishing_expeditions enable trigger expedition_return_notice')
 expect((await db.query('select app_private.notify_due_expeditions() n')).rows[0].n).toBe(1)
 expect((await db.query('select app_private.notify_due_expeditions() n')).rows[0].n).toBe(0)
 expect((await asUser(owner,'select category,kind,expedition_id from public.notifications where expedition_id=$1',[id])).rows).toEqual([{category:'general',kind:'system',expedition_id:id}])
 expect((await asUser(other,'select id from public.notifications where expedition_id=$1',[id])).rows).toHaveLength(0)
 await expect(asUser(owner,'select app_private.notify_due_expeditions()')).rejects.toThrow(/permission denied/)
 await action('claim',null,null,id)
 expect((await db.query('select count(*)::int n from public.notifications where expedition_id=$1',[id])).rows[0].n).toBe(1)
})

it('enforces the revised durations, prices and compound bonus cargo',async()=>{
 await db.exec(successDefinition.replace(/AS \$function\$[\s\S]*?\$function\$/,()=> 'AS $function$ begin return 10000; end; $function$'));
 const plans=[['breeze',800,30,1,'bait'],['coastal',1200,120,2,'bait'],['shrimp',2200,90,2,'bait_special'],['salvage',2500,240,4,'bait_magnet'],['candy',4500,300,4,'bait_forbidden_star'],['discovery',4500,360,3,'bait_first_greeting'],['starlit',6500,1440,6,'mixed']];
 for(const [id,price,minutes,extra,bait]of plans){
  await db.query("update public.player_wallets set gold=50000,inventory=jsonb_build_object('bait',100) where user_id=$1",[owner]);
  const v=(await db.query('select * from public.fishing_vessels where id=$1',[id])).rows[0];
  expect(v.price).toBe(price);expect(v.duration_minutes).toBe(minutes);
  await action('buy',id);expect((await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0].gold).toBe(50000-price);
  const trip=await action('depart',id,{bait:v.min_baits});
  expect(Date.parse(trip.active.returns_at)-Date.parse(trip.active.departed_at)).toBeCloseTo(minutes*60000,-2);
  await action('instant',null,null,trip.active.id);const result=(await action('claim',null,null,trip.active.id)).receipt.result;
  const bonus=result.items.filter(x=>x.bonus);expect(bonus).toHaveLength(extra);
  if(bait==='mixed'){expect(bonus.filter(x=>x.baitId==='bait')).toHaveLength(5);expect(bonus.filter(x=>x.baitId==='bait_epic')).toHaveLength(1)}
  else if(id==='discovery'){for(const item of bonus)expect(['bait_first_greeting','bait_special']).toContain(item.baitId)}
  else for(const item of bonus)expect(item.baitId).toBe(bait);
 }
});
it('uses the fullcatch reduction in each draw and caps safe bait success at 100%',async()=>{
 expect((await db.query("select app_private.expedition_success_chance_bp('bait',200) normal,app_private.expedition_success_chance_bp('bait_safe',200) safe")).rows[0]).toEqual({normal:4200,safe:10000});
 await db.exec(successDefinition.replace(/AS \$function\$[\s\S]*?\$function\$/,()=> 'AS $function$ begin return 9800; end; $function$'));
 await action('buy','fullcatch');const trip=await action('depart','fullcatch',{bait:15});
 expect(trip.active.vessel_snapshot).toMatchObject({failure_reduction_bp:200,bonus_count:0,price:1800});
 await action('instant',null,null,trip.active.id);const result=(await action('claim',null,null,trip.active.id)).receipt.result;
 expect(result).toMatchObject({attempted:15,failed:0,succeeded:15});expect(result.items.every(x=>!x.bonus)).toBe(true);
});
it('preserves old departure effects when the catalog has changed and snapshot columns are missing',async()=>{
 await db.exec(successDefinition.replace(/AS \$function\$[\s\S]*?\$function\$/,()=> 'AS $function$ begin return 10000; end; $function$'));
 const trip=await action('depart','dinghy',{bait:3});
 await db.query("update public.fishing_expeditions set vessel_snapshot=(vessel_snapshot-'bonus_basic_count'-'failure_reduction_bp')||jsonb_build_object('bonus_count',1) where id=$1",[trip.active.id]);
 await action('instant',null,null,trip.active.id);const result=(await action('claim',null,null,trip.active.id)).receipt.result;
 expect(result).toMatchObject({attempted:4,failed:0,succeeded:4});expect(result.items.filter(x=>x.bonus)).toHaveLength(1);
});
