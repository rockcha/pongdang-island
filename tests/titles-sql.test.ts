// @vitest-environment node
import {beforeAll,beforeEach,afterEach,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const uid='00000000-0000-0000-0000-000000000901',other='00000000-0000-0000-0000-000000000902'
async function user(sql,args=[],who=uid){await db.exec('savepoint request;set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[who]);return await db.query(sql,args)}catch(e){await db.exec('rollback to savepoint request');throw e}finally{await db.exec('reset role;release savepoint request')}}
async function state(){return (await user('select public.title_state() s')).rows[0].s}
async function log({at='2026-10-19T12:00:00Z',kind=null,rarity=null,species=null,source='manual',bait='bait',region='pongdang',last=false,vessel=null,batch=null,item=null}={}){await db.query('insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id,collectible_id,bait_id,region_id,last_bait,vessel_id,batch_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[uid,crypto.randomUUID(),at,source,kind,rarity,species,item,bait,region,last,vessel,batch])}
async function earned(){return (await state()).titles.filter(t=>t.earnedAt).map(t=>t.id)}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
beforeEach(async()=>{await db.exec('begin');for(const [id,name]of [[uid,'낚시꾼'],[other,'친구']]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name]);await db.query('insert into public.player_wallets(user_id,gold) values($1,50000)',[id])}})
afterEach(async()=>{await db.exec('rollback')});afterAll(async()=>{await db?.close()})
it('lists all 69 titles and forbids equipping an unearned title',async()=>{
 const s=await state();expect(s.titles).toHaveLength(69);expect(s.titles.filter(t=>t.category==='growth')).toHaveLength(41)
 expect(s.equipped).toBe('beginner');expect(s.titles.filter(t=>t.earnedAt).map(t=>t.id)).toEqual(['beginner'])
 await expect(user("select public.equip_title('fishing-4')")).rejects.toThrow(/NOT_EARNED/)
})
it('hides all unearned requirements in RPC responses and direct catalog reads',async()=>{
 const s=await state(),hidden=s.titles.find(t=>t.id==='last-miracle')
 expect(hidden).toMatchObject({description:null,target:null,progress:null,extra_target:null,extraProgress:null})
 expect(hidden).not.toHaveProperty('metric')
 expect((await user("select description,metric,target from public.title_catalog where id='last-miracle'")).rows).toEqual([])
 await expect(user('select * from app_private.title_acquisition_evidence')).rejects.toThrow(/permission denied/)
 await expect(user('select app_private.rare_title_metrics($1)',[uid])).rejects.toThrow(/permission denied/)
 await db.query("select app_private.award_title($1,'last-miracle')",[uid])
 expect((await state()).titles.find(t=>t.id==='last-miracle').description).toBe('마지막 남은 미끼로 미발견 신화종 직접 포획')
 expect((await user("select description from public.title_catalog where id='last-miracle'")).rows).toHaveLength(1)
 expect((await user("select description from public.title_catalog where id='last-miracle'",[],other)).rows).toEqual([])
})
async function acquired(species){
 const id=(await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[uid,species])).rows[0].id
 await db.query('insert into public.player_discoveries(user_id,species_id) values($1,$2) on conflict do nothing',[uid,species])
 return id
}
async function manualCatch(species,region,last=false){
 const item=await acquired(species),s=(await db.query('select kind,rarity from public.collectible_species where id=$1',[species])).rows[0]
 await log({species,region,item,kind:s.kind,rarity:s.rarity,last})
 return item
}
it('recognizes two native mythics only when caught manually in their own sea',async()=>{
 const fish=(await db.query("select id from public.collectible_species where native_region_id='whitenight' and rarity='mythic' and kind='fish' limit 2")).rows
 expect(fish).toHaveLength(2)
 await manualCatch(fish[0].id,'whitenight');await manualCatch(fish[1].id,'pongdang')
 expect(await earned()).not.toContain('sea-recognized')
 await manualCatch(fish[1].id,'whitenight')
 expect(await earned()).toContain('sea-recognized')
})
it('records the last undiscovered mythic and last-bait miracle at acquisition time',async()=>{
 await db.query("insert into public.player_discoveries(user_id,species_id) select $1,id from public.collectible_species where kind='fish' and rarity='mythic' and id<>'muk-hyeonmu'",[uid])
 await manualCatch('muk-hyeonmu','mukhyang',true)
 expect(await earned()).toEqual(expect.arrayContaining(['last-legend','last-miracle']))
 await db.query('delete from public.player_collectibles where user_id=$1',[uid])
 expect(await earned()).toEqual(expect.arrayContaining(['last-legend','last-miracle']))
})
it('requires the native collection to be complete before an away-sea mythic catch',async()=>{
 await manualCatch('muk-hyeonmu','pongdang')
 expect(await earned()).not.toContain('forgotten-home')
 await db.query("insert into public.player_discoveries(user_id,species_id) select $1,id from public.collectible_species where native_region_id='mukhyang' on conflict do nothing",[uid])
 await manualCatch('muk-hyeonmu','pongdang')
 expect(await earned()).toContain('forgotten-home')
})
it('preserves rare tank achievements after removing their residents',async()=>{
 const tank=(await user('select public.aquarium_state() s')).rows[0].s.tanks[0].id
 const trash=(await db.query("select id from public.collectible_species where kind='trash' limit 20")).rows
 expect(trash).toHaveLength(20)
 for(const s of trash)await db.query('insert into public.player_collectibles(user_id,species_id,tank_id) values($1,$2,$3)',[uid,s.id,tank])
 expect(await earned()).toContain('not-trash')
 await db.query('update public.player_collectibles set tank_id=null where user_id=$1',[uid])
 for(let i=0;i<10;i++)await db.query("insert into public.player_collectibles(user_id,species_id,tank_id) values($1,$2,$3)",[uid,i===9?'muk-hyeonmu':'muk-inkdrop-puffer',tank])
 expect(await earned()).toContain('ink-master')
 await db.query('update public.player_collectibles set tank_id=null where user_id=$1',[uid])
 const stars=(await db.query("select distinct on(native_region_id) id from public.collectible_species where is_native and rarity='mythic' order by native_region_id,id limit 7")).rows
 expect(stars).toHaveLength(7)
 for(const s of stars)await db.query('insert into public.player_collectibles(user_id,species_id,tank_id) values($1,$2,$3)',[uid,s.id,tank])
 expect(await earned()).toContain('sleeping-stars')
 await db.query('update public.player_collectibles set tank_id=null where user_id=$1',[uid])
 expect(await earned()).toEqual(expect.arrayContaining(['not-trash','ink-master','sleeping-stars']))
})
async function harborCatch(vessel,bait,region,items){
 let boat=(await db.query('select id from public.harbor_boats where user_id=$1 and vessel_id=$2',[uid,vessel])).rows[0]
 if(!boat)boat=(await db.query('insert into public.harbor_boats(user_id,vessel_id,instance_no) values($1,$2,1) returning id',[uid,vessel])).rows[0]
 await db.query("insert into public.harbor_voyages(user_id,vessel_id,boat_id,region_id,vessel_snapshot,departed_at,returns_at,claimed_at,result) values($1,$2,$3,$4,$5,now()-interval '2 hours',now()-interval '1 hour',now(),$6)",[uid,vessel,boat.id,region,{catch_bait_id:bait},{items}])
}
it('counts only new conch discoveries and new raft discoveries across claimed voyages',async()=>{
 const species=(await db.query("select id,kind,rarity from public.collectible_species where kind='fish' order by id limit 150")).rows
 const items=[]
 for(const s of species){const id=await acquired(s.id);items.push({id,species:s})}
 await harborCatch('conch-explorer','bait_first_greeting','pongdang',items.slice(0,49))
 expect(await earned()).not.toContain('nameless-friends')
 await harborCatch('conch-explorer','bait_first_greeting','pongdang',items.slice(49,50))
 expect(await earned()).toContain('nameless-friends')
 await harborCatch('fishing-raft','bait','pongdang',items.slice(50,149))
 expect(await earned()).not.toContain('slow-collector')
 await harborCatch('fishing-raft','bait','pongdang',items.slice(149))
 expect(await earned()).toContain('slow-collector')
})
it('requires a native harbor catch from every sea and excludes manual catches',async()=>{
 const fish=(await db.query("select distinct on(r.id) r.id region,s.id from public.regions r join public.collectible_species s on s.native_region_id=r.id and s.is_native order by r.id,s.id")).rows
 expect(fish.length).toBe((await db.query('select count(*)::int n from public.regions')).rows[0].n)
 for(const s of fish.slice(0,-1))await harborCatch('neoul-boat','bait',s.region,[{id:crypto.randomUUID(),species:{id:s.id}}])
 expect(await earned()).not.toContain('never-anchor')
 const last=fish.at(-1)
 await manualCatch(last.id,last.region)
 expect(await earned()).not.toContain('never-anchor')
 await harborCatch('neoul-boat','bait',last.region,[{id:crypto.randomUUID(),species:{id:last.id}}])
 expect(await earned()).toContain('never-anchor')
})
it('awards all four tailwind tiers only to the sender and sends each notice once',async()=>{
 for(let i=0;i<100;i++){
  const trip=(await db.query("insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at,claimed_at) values($1,'dinghy','pongdang','{\"bait\":3}','{}',now()+interval '1 hour',now()) returning id",[other])).rows[0].id
  await db.query('insert into app_private.expedition_boosts(expedition_id,helper_id,nickname) values($1,$2,$3)',[trip,uid,'sender'])
  if([4,19,49,99].includes(i)){
   const titles=(await state()).titles.filter(t=>t.id.startsWith('tailwind-'))
   expect(titles.filter(t=>t.earnedAt)).toHaveLength([4,19,49,99].indexOf(i)+1)
   expect(titles[3].progress).toBe(i===99?100:null)
  }
 }
 expect((await db.query('select 1 from app_private.title_dirty where user_id=$1',[uid])).rows).toHaveLength(1)
 await state();await state()
 expect((await db.query("select count(*) n from public.notifications where recipient_id=$1 and achievement_id like 'tailwind-%'",[uid])).rows[0].n).toBe(4)
 expect((await user('select public.title_state() s',[],other)).rows[0].s.titles.filter(t=>t.id.startsWith('tailwind-')).every(t=>!t.earnedAt&&t.progress===null)).toBe(true)
 expect((await user("select public.equip_title('tailwind-4') s")).rows[0].s.equipped).toBe('tailwind-4')
})
it('records real fishing attempts, sends each achievement once, equips and clears it',async()=>{
 await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id) select $1,gen_random_uuid(),'pongdang','bait' from generate_series(1,30)",[uid])
 expect(await earned()).toContain('fishing-1')
 await state();expect((await db.query("select count(*) n from public.notifications where recipient_id=$1 and achievement_id='fishing-1'",[uid])).rows[0].n).toBe(1)
 expect((await user("select public.equip_title('fishing-1') s")).rows[0].s.equipped).toBe('fishing-1')
 expect((await db.query('select equipped_title from public.player_profiles where id=$1',[uid])).rows[0].equipped_title).toBe('첫 물결의 낚시꾼')
 expect((await user('select public.equip_title(null) s')).rows[0].s.equipped).toBeNull()
})
it('uses Korea time for dawn and retains titles permanently after evidence disappears',async()=>{
 for(let i=0;i<10;i++)await log({at:'2026-10-18T17:00:00Z'})
 await log({at:'2026-10-18T20:00:00Z'})
 const s=await state();expect(s.titles.find(t=>t.id==='dawn-1')).toMatchObject({progress:10})
 expect(await earned()).toContain('dawn-1')
 await db.query('delete from app_private.title_fishing_log where user_id=$1',[uid]);expect(await earned()).toContain('dawn-1')
})
it('recognizes failure recovery, last bait and first-cast mythic without duplicate notices',async()=>{
 for(let i=0;i<5;i++)await log({at:`2026-10-19T01:00:0${i}Z`})
 await log({at:'2026-10-19T01:00:06Z',kind:'fish',rarity:'epic',species:'epic',last:true})
 await log({at:'2026-10-20T01:00:00Z',kind:'fish',rarity:'mythic',species:'legend'})
 const ids=await earned();expect(ids).toEqual(expect.arrayContaining(['after-failure','last-bite','first-legend']))
})
it('requires five distinct species in consecutive attempts from the same sea',async()=>{
 for(let i=0;i<5;i++)await log({at:`2026-10-19T01:00:0${i}Z`,kind:'fish',rarity:'common',species:'fish'+i})
 expect(await earned()).toContain('five-species')
})
it('recognizes daily collections, distinct baits, midnight and a double-mythic dinghy',async()=>{
 const kinds=['fish','trash','decoration','map','fish'],rarities=['common','rare','epic','mythic','common']
 for(let i=0;i<5;i++)await log({at:`2026-10-19T01:00:0${i}Z`,kind:kinds[i],rarity:rarities[i],species:'fish'+i,bait:'bait'+i})
 await log({at:'2026-10-19T14:59:00Z'});await log({at:'2026-10-19T15:01:00Z'})
 for(let i=0;i<2;i++)await log({source:'expedition',kind:'fish',rarity:'mythic',species:'legend'+i,batch:'one',vessel:'dinghy'})
 expect(await earned()).toEqual(expect.arrayContaining(['full-course','all-rarities','five-baits','midnight','dinghy-mythic','double-mythic']))
})
it('requires five mythic species as well as fifty catches for the highest mythic title',async()=>{
 for(let i=0;i<50;i++)await log({kind:'fish',rarity:'mythic',species:'same'})
 expect(await earned()).not.toContain('mythic-4')
 for(let i=0;i<4;i++)await log({kind:'fish',rarity:'mythic',species:'other'+i})
 expect(await earned()).toContain('mythic-4')
})
it('awards tank decoration titles immediately and keeps them after removal',async()=>{
 const tank=(await user('select public.aquarium_state() s')).rows[0].s.tanks[0].id
 const species=(await db.query("select id from public.collectible_species where kind='trash' limit 5")).rows
 for(const s of species)await db.query('insert into public.player_collectibles(user_id,species_id,tank_id) values($1,$2,$3)',[uid,s.id,tank])
 expect((await db.query("select * from public.player_titles where user_id=$1 and title_id='tank-trash'",[uid])).rows).toHaveLength(1)
 await db.query('update public.player_collectibles set tank_id=null where user_id=$1',[uid]);expect(await earned()).toContain('tank-trash')
})
it('does not expose raw evidence, forged awards or other players ownership',async()=>{
 await user('select public.title_state()');await db.query("select app_private.award_title($1,'fishing-1')",[other])
 expect((await user('select * from public.player_titles')).rows.map(t=>t.title_id)).toEqual(['beginner'])
 await expect(user("select app_private.award_title($1,'fishing-1')",[uid])).rejects.toThrow(/permission denied/)
 await expect(user('select * from app_private.title_fishing_log')).rejects.toThrow(/permission denied/)
 await expect(user("update public.player_profiles set equipped_title='첫 물결의 낚시꾼' where id=$1",[uid])).rejects.toThrow(/permission denied/)
})
it('captures last-bait evidence at preparation before inventory changes',async()=>{
 await db.query("update public.player_wallets set inventory='@@'::jsonb where user_id=$1".replace('@@','{"bait_safe":1}'),[uid])
 await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang')",[uid])
 const op=crypto.randomUUID();await user("select public.prepare_fishing('pongdang','bait_safe',$1)",[op])
 expect((await db.query('select last_bait from app_private.prepared_fishing_casts where operation_id=$1',[op])).rows[0].last_bait).toBe(true)
 await db.query("update app_private.prepared_fishing_casts set eligible=true,species_id='god-devouring-leviathan',rarity='mythic',snapshot=app_private.species_payload('god-devouring-leviathan',null),created_at=clock_timestamp()-interval '20 seconds' where operation_id=$1",[op])
 await user('select public.finish_fishing($1,true)',[op]);expect(await earned()).toContain('last-bite')
})
it('recognizes reciprocal friendship gifts, fresh catches and different neighbors',async()=>{
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[uid,other])
 const caught=(await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'orange-clownfish') returning id",[uid])).rows[0].id
 await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,collectible_id) values($1,gen_random_uuid(),'pongdang','bait',$2)",[uid,caught])
 await user("select public.send_collectible_gift($1,$2,'',gen_random_uuid())",[other,[caught]])
 const back=(await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'orange-clownfish') returning id",[other])).rows[0].id
 await user("select public.send_collectible_gift($1,$2,'',gen_random_uuid())",[uid,[back]],other)
 const home=(await user('select public.aquarium_state() s')).rows[0].s.tanks[0].id
 for(let i=0;i<3;i++){
  const friend=i===0?other:crypto.randomUUID()
  if(i){await db.query('insert into auth.users(id) values($1)',[friend]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[friend,'이웃'+i])}
  const tank=(await user('select public.aquarium_state() s',[],friend)).rows[0].s.tanks[0].id
  await db.query('insert into public.aquarium_feedings(visitor_id,owner_id,tank_id,operation_id,clicks,completed_at) values($1,$2,$3,gen_random_uuid(),3,now())',[uid,friend,tank])
  await db.query('insert into public.aquarium_cleanings(visitor_id,owner_id,tank_id,operation_id,strokes,completed_at) values($1,$2,$3,gen_random_uuid(),3,now())',[uid,friend,tank])
 }
 await db.query('insert into public.aquarium_feedings(visitor_id,owner_id,tank_id,operation_id,clicks,completed_at) values($1,$2,$3,gen_random_uuid(),3,now())',[other,uid,home])
 expect(await earned()).toEqual(expect.arrayContaining(['fresh-gift','friend-day-gift','mutual-care','three-neighbors']))
 expect((await user('select public.sync_titles() n')).rows[0].n).toBe(0)
})

it('delivers welcome gold once and credits only when the recipient claims',async()=>{
 const gifts=(await user('select public.gift_mailbox() s')).rows[0].s.items
 expect(gifts).toHaveLength(1);const gift=gifts[0]
 expect(gift).toMatchObject({sender_id:null,sender_name:'퐁당섬 운영자',source:'system',reward_kind:'gold',quantity:500,status:'pending'})
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(50000)
 await expect(user('select public.claim_collectible_gift($1)',[gift.id],other)).rejects.toThrow(/GIFT_NOT_FOUND/)
 await expect(user('select app_private.send_welcome_gift($1)',[other])).rejects.toThrow(/permission denied/)
 await user('select public.claim_collectible_gift($1)',[gift.id]);await user('select public.claim_collectible_gift($1)',[gift.id])
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(50500)
 await db.query("update auth.users set raw_user_meta_data=jsonb_build_object('game_nickname','새이름') where id=$1",[uid])
 await user('select public.sync_player_profile()');await user('select public.sync_player_profile()')
 expect((await user('select public.gift_mailbox() s')).rows[0].s.items).toHaveLength(1)
 expect((await db.query('select app_private.send_welcome_gift($1) gift',[uid])).rows[0].gift).toBeNull()
 expect((await db.query('select count(*) n from public.notifications where recipient_id=$1 and gift_id=$2',[uid,gift.id])).rows[0].n).toBe(1)
})

it('awards the full course for fish, trash and decoration on one Korea date without a map',async()=>{
 await log({kind:'fish',rarity:'common',species:'fish'});await log({kind:'trash',rarity:'common',species:'trash'});
 expect(await earned()).not.toContain('full-course');
 await log({kind:'decoration',rarity:'common',species:'decor'});
 expect(await earned()).toContain('full-course');
 expect((await state()).titles.find(t=>t.id==='full-course').description).toBe('하루에 물고기·쓰레기·장식물 모두 포획');
});
