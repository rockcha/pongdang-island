// @vitest-environment node
import {beforeAll,beforeEach,afterEach,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const uid='00000000-0000-0000-0000-000000000801',other='00000000-0000-0000-0000-000000000802'
async function user(sql,args=[],who=uid){await db.exec('savepoint request;set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[who]);return await db.query(sql,args)}catch(e){await db.exec('rollback to savepoint request');throw e}finally{await db.exec('reset role;release savepoint request')}}
async function state(){return (await user('select public.quest_state() s')).rows[0].s}
async function claim(kind,start,id,who=uid){return (await user('select public.claim_quest($1,$2,$3) s',[kind,start,id],who)).rows[0].s}
async function gold(){return (await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold}
async function ledger(item,n=1){for(let i=0;i<n;i++)await db.query("insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values($1,gen_random_uuid(),'buy',$2,-10)",[uid,item])}
async function attempts(n=5){for(let i=0;i<n;i++)await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id) values($1,gen_random_uuid(),'pongdang','bait')",[uid])}
async function help(n=30,helper=uid,createdAt=new Date().toISOString()){
 const trips=(await db.query("insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at,claimed_at,result) select $1,'dinghy','pongdang','{}','{}',now(),now(),'{}' from generate_series(1,$2) returning id",[helper===uid?other:uid,n])).rows
 for(const trip of trips)await db.query("insert into app_private.expedition_boosts(expedition_id,helper_id,nickname,created_at) values($1,$2,'도우미',$3)",[trip.id,helper,createdAt])
}
async function catchFish(species){const id=(await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[uid,species])).rows[0].id;await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,collectible_id) values($1,gen_random_uuid(),'pongdang','bait',$2)",[uid,id])}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
beforeEach(async()=>{await db.exec('begin');for(const [id,name]of [[uid,'퀘스트'],[other,'친구']]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name]);await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,50000,'{\"bait\":100}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory",[id])}})
afterEach(async()=>{await db.exec('rollback')})
afterAll(async()=>{await db?.close()})
it('returns requested goals and rewards with no progress for a new player',async()=>{
 const s=await state();expect(s.daily.quests).toHaveLength(6);expect(s.weekly.quests).toHaveLength(9)
 expect(s.daily.bonus).toBe(200);expect(s.weekly.bonus).toBe(1000)
 expect(s.daily.quests.filter(q=>q.rewardFuel).map(q=>[q.id,q.rewardFuel,q.reward])).toEqual([['post',1,0],['depart',1,0],['care',1,0]])
 expect(s.daily.quests.every(q=>!q.complete)).toBe(true)
 expect(s.weekly.quests.filter(q=>q.rewardFuel).map(q=>[q.id,q.rewardFuel,q.reward])).toEqual([['trade',3,0],['gift',5,0]])
 expect(s.weekly.quests.filter(q=>!q.rewardFuel).map(q=>q.reward)).toEqual([80,80,80,80,80,80,80])
 expect(s.weekly.quests.every(q=>!q.complete)).toBe(true)
 await expect(claim('daily',s.daily.start,'fish')).rejects.toThrow(/INCOMPLETE/)
 await expect(claim('daily',s.daily.start,'all')).rejects.toThrow(/INCOMPLETE/)
})
it('does not pay fuel again for a quest already claimed before the reward changed',async()=>{
 await user("select public.exchange_post('sell','bait','bait',1,'gold','gold',30,gen_random_uuid())")
 const s=await state()
 await db.query("insert into app_private.quest_claims(user_id,period_kind,period_start,quest_id,gold) values($1,'daily',$2,'post',30)",[uid,s.daily.start])
 expect((await claim('daily',s.daily.start,'post')).creditedFuel).toBe(0)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[uid])).rows[0].inventory.fuel).toBeUndefined()
})
it('checks the fuel cap atomically and can grant fuel when gold is already full',async()=>{
 await user("select public.exchange_post('sell','bait','bait',1,'gold','gold',30,gen_random_uuid())")
 const s=await state()
 await db.query("update public.player_wallets set gold=1000000000,inventory=jsonb_set(inventory,'{fuel}','100000') where user_id=$1",[uid])
 await expect(claim('daily',s.daily.start,'post')).rejects.toThrow(/FUEL_LIMIT/)
 expect((await state()).daily.quests.find(q=>q.id==='post').claimed).toBe(false)
 await db.query("update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}','0') where user_id=$1",[uid])
 const result=await claim('daily',s.daily.start,'post')
 expect(result).toMatchObject({credited:0,creditedFuel:1})
 expect(await gold()).toBe(1000000000)
})
it('counts failed manual attempts and credits a reward exactly once',async()=>{
 await attempts();const s=await state(),before=await gold()
 expect(s.daily.quests.find(q=>q.id==='fish')).toMatchObject({progress:5,complete:true})
 expect((await claim('daily',s.daily.start,'fish')).credited).toBe(30)
 expect((await claim('daily',s.daily.start,'fish')).credited).toBe(0)
 expect(await gold()).toBe(before+30)
 await expect(claim('daily',s.daily.start,'fish',other)).rejects.toThrow(/INCOMPLETE/)
})
it('counts paid games, map and rod buys but ignores test charge and other purchases',async()=>{
 await ledger('arcade:memory');await ledger('map:coral');await ledger('rod:bronze');await ledger('bait')
 const s=await state();expect(s.daily.quests.find(q=>q.id==='game').complete).toBe(true)
 expect(s.weekly.quests.find(q=>q.id==='map').complete).toBe(true);expect(s.weekly.quests.find(q=>q.id==='rod').complete).toBe(true)
 expect(s.daily.quests.find(q=>q.id==='post').complete).toBe(false)
})
it('omits map purchase when all maps are owned but keeps a purchase made this week',async()=>{
 await db.query('insert into public.player_map_fragments(user_id,region_id) select $1,region_id from public.region_maps on conflict do nothing',[uid])
 expect((await state()).weekly.quests.some(q=>q.id==='map')).toBe(false)
 await ledger('map:coral');expect((await state()).weekly.quests.find(q=>q.id==='map')).toMatchObject({complete:true})
})
it('uses Seoul midnight and Monday week boundaries and rejects stale claims',async()=>{
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 const before=(await db.query("select app_private.quest_period('weekly','2026-10-18T14:59:59Z') p")).rows[0].p
 const after=(await db.query("select app_private.quest_period('weekly','2026-10-18T15:00:00Z') p")).rows[0].p
 expect(before.start).toBe('2026-10-12');expect(after.start).toBe('2026-10-19')
 await expect(claim('daily','2020-01-01','fish')).rejects.toThrow(/PERIOD_CHANGED/)
})
it('counts rare and epic fish but not gifted inventory as catches',async()=>{
 await catchFish('god-devouring-leviathan')
 await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'orange-clownfish')",[uid])
 const s=await state();expect(s.daily.quests.find(q=>q.id==='rare').progress).toBe(1);expect(s.weekly.quests.find(q=>q.id==='epic').progress).toBe(1)
 expect(s.daily.quests.find(q=>q.id==='fish').progress).toBe(1)
})
it('includes collected expedition catches but not failed attempts or mere departures',async()=>{
 const items=Array.from({length:10},()=>({species:{kind:'decoration',rarity:'common'}}));items.push({species:{kind:'fish',rarity:'epic'}})
 await db.query("insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at,claimed_at,result) values($1,'dinghy','pongdang','{}','{}',now(),now(),$2)",[uid,{items,failed:20}])
 const s=await state();expect(s.weekly.quests.find(q=>q.id==='decor').progress).toBe(10);expect(s.weekly.quests.find(q=>q.id==='epic').progress).toBe(1)
 expect(s.daily.quests.find(q=>q.id==='depart').complete).toBe(true);expect(s.daily.quests.find(q=>q.id==='fish').progress).toBe(0)
})
it('grants the daily completion bonus once and does not require individual claims first',async()=>{
 await attempts();await catchFish('god-devouring-leviathan');await ledger('arcade:shadow')
 await user("select public.exchange_post('sell','bait','bait',1,'gold','gold',30,gen_random_uuid())")
 await db.query("insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at) values($1,'dinghy','pongdang','{}','{}',now()+interval '1 hour')",[uid])
 const tank=(await user('select public.aquarium_state() s',[],other)).rows[0].s.tanks[0].id
 await db.query('insert into public.aquarium_feedings(visitor_id,owner_id,tank_id,operation_id,clicks,completed_at) values($1,$2,$3,gen_random_uuid(),3,now())',[uid,other,tank])
 const s=await state();expect(s.daily.bonusReady).toBe(true);const before=await gold()
 for(const id of ['post','depart','care']){expect((await claim('daily',s.daily.start,id)).creditedFuel).toBe(1);expect((await claim('daily',s.daily.start,id)).creditedFuel).toBe(0)}
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[uid])).rows[0].inventory.fuel).toBe(3)
 expect((await claim('daily',s.daily.start,'all')).credited).toBe(200)
 expect((await claim('daily',s.daily.start,'all')).credited).toBe(0);expect(await gold()).toBe(before+200)
})
it('blocks direct claim writes and enforces the wallet cap atomically',async()=>{
 await attempts();const s=await state()
 await expect(user("insert into app_private.quest_claims values($1,'daily',current_date,'fish',30,now())",[uid])).rejects.toThrow(/permission denied/)
 await db.query('update public.player_wallets set gold=1000000000 where user_id=$1',[uid])
 await expect(claim('daily',s.daily.start,'fish')).rejects.toThrow(/GOLD_LIMIT/)
 expect((await state()).daily.quests.find(q=>q.id==='fish').claimed).toBe(false)
 await expect(user('select public.quest_state()',[],null)).rejects.toThrow(/AUTH_REQUIRED/)
})
it('counts real trades and sent gifts separately and pays all weekly rewards only once',async()=>{
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[uid,other])
 for(let i=0;i<3;i++){
  const item=(await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'orange-clownfish') returning id",[uid])).rows[0].id
  await user("select public.send_collectible_gift($1,$2,'',gen_random_uuid())",[other,[item]])
 }
 for(let i=0;i<7;i++){
  const listing=(await user("select public.exchange_post('sell','bait','bait',1,'gold','gold',30,gen_random_uuid()) s")).rows[0].s
  await user("select public.exchange_action($1,'accept')",[listing.id],other)
 }
 await attempts(40);await catchFish('god-devouring-leviathan')
 for(let i=0;i<10;i++){await catchFish('glass-bottle');await catchFish('rusty-mini-anchor')}
 await ledger('map:coral');await ledger('rod:bronze')
 await help()
 const s=await state();expect(s.weekly.bonusReady).toBe(true)
 expect(s.weekly.quests.find(q=>q.id==='gift').progress).toBe(3);expect(s.weekly.quests.find(q=>q.id==='trade').progress).toBe(7)
 const before=await gold()
 for(const q of s.weekly.quests){const result=await claim('weekly',s.weekly.start,q.id);expect(result.credited).toBe(q.reward);expect(result.creditedFuel).toBe(q.rewardFuel??0)}
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[uid])).rows[0].inventory.fuel).toBe(8)
 expect((await claim('weekly',s.weekly.start,'all')).credited).toBe(1000)
 expect((await claim('weekly',s.weekly.start,'all')).credited).toBe(0)
 expect(await gold()).toBe(before+1560)
})

it('omits the weekly rod purchase for full ownership while preserving a purchase this week',async()=>{
 await db.query('insert into public.player_fishing_rods(user_id,rod_id) select $1,id from public.fishing_rods on conflict do nothing',[uid]);
 expect((await state()).weekly.quests.some(q=>q.id==='rod')).toBe(false);
 await ledger('rod:bronze');
 expect((await state()).weekly.quests.find(q=>q.id==='rod')).toMatchObject({complete:true,progress:1});
 const s=await state();await claim('weekly',s.weekly.start,'rod');
 expect((await state()).weekly.quests.find(q=>q.id==='rod').claimed).toBe(true);
});

it('adds regional collection growth goals and one weekly help goal',async()=>{
 const s=await state()
 expect(s.growth).toMatchObject({kind:'growth',start:'2000-01-01',resetsAt:null,bonus:0,bonusReady:false})
 const regions=(await db.query("select count(distinct native_region_id)::int n from public.collectible_species where kind in ('fish','trash','decoration')")).rows[0].n
 expect(s.growth.quests).toHaveLength(16+regions)
 expect(s.growth.quests.every(q=>!q.complete&&!q.claimed)).toBe(true)
 expect(s.daily.quests).toHaveLength(6);expect(s.weekly.quests).toHaveLength(9)
 await expect(claim('growth',s.growth.start,'all')).rejects.toThrow(/INVALID_QUEST/)
 await expect(user('select app_private.growth_quest_period()')).rejects.toThrow(/permission denied/)
})
it('uses existing ownership for growth and excludes default themes and the starter sea',async()=>{
 await db.query("insert into public.owned_aquarium_backgrounds(user_id,background_id) values($1,'default') on conflict do nothing",[uid])
 await db.query("insert into public.player_map_fragments(user_id,region_id) values($1,'pongdang') on conflict do nothing",[uid])
 let s=await state()
 expect(s.growth.quests.find(q=>q.id==='themes_1').progress).toBe(0)
 expect(s.growth.quests.find(q=>q.id==='maps_1').progress).toBe(0)
 await db.query("insert into public.owned_aquarium_backgrounds(user_id,background_id,purchased_at) select $1,id,'2020-01-01' from public.aquarium_backgrounds where price>0 and id<>'default' order by id limit 3 on conflict do nothing",[uid])
 await db.query("insert into public.player_map_fragments(user_id,region_id,acquired_at) select $1,id,'2020-01-01' from public.regions where requires_map_fragment order by id limit 3 on conflict do nothing",[uid])
 s=await state()
 expect(s.growth.quests.find(q=>q.id==='themes_3')).toMatchObject({complete:false,progress:3})
 expect(s.growth.quests.find(q=>q.id==='themes_5')).toMatchObject({complete:false,progress:3})
 expect(s.growth.quests.find(q=>q.id==='maps_3')).toMatchObject({complete:true,progress:3})
 expect(s.growth.quests.find(q=>q.id==='maps_5')).toMatchObject({complete:false,progress:3})
})
it('counts tanks including the first one and pays each permanent tier once',async()=>{
 await user('select public.buy_aquarium_tank(gen_random_uuid())')
 const s=await state(),before=await gold()
 expect(s.growth.quests.find(q=>q.id==='tanks_2')).toMatchObject({complete:true,progress:2})
 expect((await claim('growth',s.growth.start,'tanks_2')).credited).toBe(100)
 expect((await claim('growth',s.growth.start,'tanks_2')).credited).toBe(0)
 expect(await gold()).toBe(before+100)
 await expect(claim('growth',s.growth.start,'tanks_2',other)).rejects.toThrow(/INCOMPLETE/)
 await expect(claim('growth','2026-10-20','tanks_2')).rejects.toThrow(/PERIOD_CHANGED/)
 expect((await db.query("select period_start::text from app_private.quest_claims where user_id=$1 and period_kind='growth'",[uid])).rows).toEqual([{period_start:'2000-01-01'}])
})
it('counts only sent tailwinds and ignores retries and received help',async()=>{
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[uid,other])
 const departure=(await user("select public.expedition_action('depart',gen_random_uuid(),'dinghy','pongdang','{\"bait\":3}') s",[],other)).rows[0].s
 await user('select public.boost_friend_expedition($1)',[departure.active.id])
 await user('select public.boost_friend_expedition($1)',[departure.active.id])
 const s=await state()
 expect(s.growth.quests.find(q=>q.id==='boost_1')).toMatchObject({complete:true,progress:1,reward:50})
 expect(s.growth.quests.find(q=>q.id==='boost_5')).toMatchObject({complete:false,progress:1})
 const recipient=(await user('select public.quest_state() s',[],other)).rows[0].s
 expect(recipient.growth.quests.find(q=>q.id==='boost_1').progress).toBe(0)
 expect((await claim('growth',s.growth.start,'boost_1')).credited).toBe(50)
})
it('rolls growth claims back at the gold cap without creating a permanent claim',async()=>{
 await user('select public.buy_aquarium_tank(gen_random_uuid())')
 const s=await state()
 await db.query('update public.player_wallets set gold=1000000000 where user_id=$1',[uid])
 await expect(claim('growth',s.growth.start,'tanks_2')).rejects.toThrow(/GOLD_LIMIT/)
 expect((await state()).growth.quests.find(q=>q.id==='tanks_2').claimed).toBe(false)
})

it('uses the rebalanced permanent targets and rewards while preserving earlier claims',async()=>{
 const goals=(await state()).growth.quests
 for(const [id,target,reward] of [
  ['boost_5',5,150],['boost_20',20,400],['boost_50',50,800],['boost_100',100,1500],
  ['tanks_3',4,200],['tanks_5',6,400],['themes_1',2,100],['themes_3',5,200],
  ['themes_5',10,400],['themes_10',15,600],['maps_1',1,50],['maps_3',3,200],['maps_5',6,400],['maps_10',10,800]
 ]) expect(goals.find(q=>q.id===id)).toMatchObject({target,reward})
 await db.query("insert into app_private.quest_claims(user_id,period_kind,period_start,quest_id,gold) values($1,'growth','2000-01-01','themes_3',150)",[uid])
 expect((await state()).growth.quests.find(q=>q.id==='themes_3')).toMatchObject({claimed:true,complete:true,target:5,reward:200})
 const before=await gold()
 expect((await claim('growth','2000-01-01','themes_3')).credited).toBe(0)
 expect(await gold()).toBe(before)
})
it('uses existing regional discoveries across every collectible kind and rewards completion once',async()=>{
 const region='pongdang',id='region_collection_'+region
 const count=(await db.query("select count(*)::int n from public.collectible_species where native_region_id=$1 and kind in ('fish','trash','decoration')",[region])).rows[0].n
 let s=await state()
 expect(s.growth.quests.find(q=>q.id===id)).toMatchObject({target:count,progress:0,reward:1000,icon:'region:pongdang',href:'/collection?region=pongdang',complete:false})
 await expect(claim('growth',s.growth.start,id)).rejects.toThrow('QUEST_INCOMPLETE')
 await db.query("insert into public.player_discoveries(user_id,species_id) select $1,id from public.collectible_species where native_region_id=$2 and kind in ('fish','trash','decoration') on conflict do nothing",[uid,region])
 s=await state();expect(s.growth.quests.find(q=>q.id===id)).toMatchObject({complete:true,progress:count})
 await expect(claim('growth',s.growth.start,id,other)).rejects.toThrow('QUEST_INCOMPLETE')
 const before=await gold()
 expect((await claim('growth',s.growth.start,id)).credited).toBe(1000)
 expect((await claim('growth',s.growth.start,id)).credited).toBe(0)
 expect(await gold()).toBe(before+1000)
 await db.query('delete from public.player_discoveries where user_id=$1',[uid])
 expect((await state()).growth.quests.find(q=>q.id===id)).toMatchObject({complete:true,claimed:true})
})
it('counts only help sent in the current Seoul week and pays 80 gold once at 30',async()=>{
 const s=await state(),start=s.weekly.start
 await help(29)
 await help(1,uid,new Date(Date.parse(start+'T00:00:00+09:00')-1).toISOString())
 await help(1,other)
 let q=(await state()).weekly.quests.find(q=>q.id==='boost')
 expect(q).toMatchObject({target:30,progress:29,complete:false,reward:80})
 await expect(claim('weekly',start,'boost')).rejects.toThrow('QUEST_INCOMPLETE')
 await help(1)
 q=(await state()).weekly.quests.find(q=>q.id==='boost');expect(q.complete).toBe(true)
 const before=await gold()
 expect((await claim('weekly',start,'boost')).credited).toBe(80)
 expect((await claim('weekly',start,'boost')).credited).toBe(0)
 expect(await gold()).toBe(before+80)
})
