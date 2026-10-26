// @vitest-environment node
import {beforeAll,beforeEach,afterEach,afterAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import catalog from '../supabase/catalog/catalog.json'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const uid='00000000-0000-0000-0000-000000000901',other='00000000-0000-0000-0000-000000000902'
async function user(sql,args=[],who=uid){await db.exec('savepoint request;set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[who]);return await db.query(sql,args)}catch(e){await db.exec('rollback to savepoint request');throw e}finally{await db.exec('reset role;release savepoint request')}}
async function state(){return (await user('select public.title_state() s')).rows[0].s}
async function log({at='2026-10-19T12:00:00Z',kind=null,rarity=null,species=null,source='manual',bait='bait',region='pongdang',last=false,vessel=null,batch=null,item=null}={}){await db.query('insert into app_private.title_fishing_log(user_id,event_key,occurred_at,source,kind,rarity,species_id,collectible_id,bait_id,region_id,last_bait,vessel_id,batch_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[uid,crypto.randomUUID(),at,source,kind,rarity,species,item,bait,region,last,vessel,batch])}
async function earned(){return (await state()).titles.filter(t=>t.earnedAt).map(t=>t.id)}
async function relicDiscovery(id:string){
 await db.query('insert into app_private.player_fishing_relics(user_id,relic_id) values($1,$2) on conflict do nothing',[uid,id])
 await db.query('insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values($1,$2) on conflict do nothing',[uid,id])
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
beforeEach(async()=>{await db.exec('begin');for(const [id,name]of [[uid,'낚시꾼'],[other,'친구']]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name]);await db.query('insert into public.player_wallets(user_id,gold) values($1,50000) on conflict(user_id) do update set gold=excluded.gold',[id])}})
afterEach(async()=>{await db.exec('rollback')});afterAll(async()=>{await db?.close()})
it('lists all catalog titles and forbids equipping an unearned title',async()=>{
 const s=await state();expect(s.titles).toHaveLength(catalog.title_catalog.length);expect(s.titles.filter(t=>t.category==='growth')).toHaveLength(73)
 expect(s.equipped).toBe('beginner');expect(s.titles.filter(t=>t.earnedAt).map(t=>t.id)).toEqual(['beginner'])
 await expect(user("select public.equip_title('fishing-4')")).rejects.toThrow(/NOT_EARNED/)
})

it('awards relic collection titles at distinct discovery boundaries and queues new discoveries',async()=>{
 const relics=(await db.query("select id from public.fishing_relics order by (rarity='mythic'),id limit 15")).rows
 const thresholds={1:'relic-first',5:'relic-five',10:'relic-ten',15:'relic-fifteen'}
 const hidden=(await state()).titles.find(t=>t.id==='relic-fifteen')
 expect(hidden).toMatchObject({earnedAt:null,description:null,target:null,progress:null})
 for(let i=0;i<relics.length;i++){
  await db.query('delete from app_private.title_dirty where user_id=$1',[uid])
  await relicDiscovery(relics[i].id)
  expect((await db.query('select * from app_private.title_dirty where user_id=$1',[uid])).rows).toHaveLength(1)
  const got=await earned()
  for(const [target,id] of Object.entries(thresholds))expect(got.includes(id)).toBe(i+1>=Number(target))
 }
 const otherState=(await user('select public.title_state() s',[],other)).rows[0].s
 expect(otherState.titles.filter(t=>t.id.startsWith('relic-')&&t.earnedAt)).toHaveLength(0)
 await expect(user('select app_private.relic_title_metrics($1)',[uid])).rejects.toThrow(/permission denied/)
})

it('recognizes prior relic discoveries without current ownership',async()=>{
 const id=(await db.query("select id from public.fishing_relics where rarity='mythic' limit 1")).rows[0].id
 await db.query('insert into app_private.player_fishing_relic_discoveries(user_id,relic_id) values($1,$2)',[uid,id])
 expect(await earned()).toEqual(expect.arrayContaining(['relic-first','relic-mythic']))
 expect((await db.query('select * from app_private.player_fishing_relics where user_id=$1',[uid])).rows).toHaveLength(0)
})

it('preserves equipped relic titles after sale and does not count a reacquired relic twice or notify twice',async()=>{
 const relic=(await db.query("select id,sell_price from public.fishing_relics where rarity='mythic' limit 1")).rows[0]
 await relicDiscovery(relic.id)
 expect(await earned()).toEqual(expect.arrayContaining(['relic-first','relic-mythic']))
 await user("select public.equip_title('relic-mythic')")
 const before=(await db.query('select count(*)::int n from public.notifications where recipient_id=$1',[uid])).rows[0].n
 await user('select public.sell_relic($1,$2,$3)',[relic.id,crypto.randomUUID(),relic.sell_price])
 expect((await state()).equipped).toBe('relic-mythic')
 await relicDiscovery(relic.id)
 await state();await user('select public.sync_titles()')
 expect((await db.query('select app_private.relic_title_metrics($1) m',[uid])).rows[0].m).toEqual({relic_discoveries:1,relic_mythic_discoveries:1})
 expect((await db.query('select count(*)::int n from public.notifications where recipient_id=$1',[uid])).rows[0].n).toBe(before)
})

async function arcadePlays(game:string,n:number){
 if(!n)return
 const selects={
  ladder:`insert into app_private.ladder_runs(user_id,operation_id,mode,stake,choice,bridges,payouts,destination,reward) select $1,gen_random_uuid(),'calm',20,0,array_fill(0,array[12]),array[0,20,20,40],0,0 from generate_series(1,$2::int)`,
  odd_even:`insert into public.odd_even_runs(user_id,operation_id,wins,round,stage,finished_at) select $1,gen_random_uuid(),5,6,'banked',now() from generate_series(1,$2::int)`,
  brick:`insert into public.brick_game_runs(user_id,operation_id,seed,finished_at) select $1,gen_random_uuid(),i,now() from generate_series(1,$2::int)i`,
  shadow:`insert into public.shadow_game_runs(user_id,operation_id,finished_at) select $1,gen_random_uuid(),now() from generate_series(1,$2::int)`,
  memory:`insert into public.memory_game_runs(user_id,operation_id,finished_at) select $1,gen_random_uuid(),now() from generate_series(1,$2::int)`,
 }
 await db.query(selects[game],[uid,n])
}
it.each([
 ['ladder',[1,100,500,2000]],['odd_even',[1,50,200,1000]],['brick',[1,10,50,200]],['shadow',[1,10,50,200]],['memory',[1,10,50,200]],
])('awards %s play-count titles exactly at each boundary and isolates other players',async(game,targets)=>{
 let count=0
 for(const [i,target] of targets.entries()){
  await arcadePlays(game,target-count-1);count=target-1
  const id=`arcade-${game.replaceAll('_','-')}-${i+1}`
  expect(await earned()).not.toContain(id)
  await arcadePlays(game,1);count++
  expect(await earned()).toContain(id)
 }
 const metrics=(await db.query('select app_private.title_metrics($1) m',[uid])).rows[0].m
 expect(metrics['arcade_'+game]).toBe(count)
 expect(metrics.arcade_total).toBe(count)
 expect(metrics.arcade_variety).toBe(1)
 expect((await user('select public.title_state() s',[],other)).rows[0].s.titles.filter(t=>t.category==='arcade'&&t.earnedAt)).toHaveLength(0)
},30000)
it('queues awards on game start, avoids duplicate notifications, and counts five-game variety',async()=>{
 await state()
 await db.query('delete from app_private.title_dirty where user_id=$1',[uid])
 await arcadePlays('ladder',1)
 expect((await db.query('select count(*)::int n from app_private.title_dirty where user_id=$1',[uid])).rows[0].n).toBe(1)
 expect((await user('select public.sync_titles() n')).rows[0].n).toBeGreaterThan(0)
 const before=(await db.query('select count(*)::int n from public.notifications where recipient_id=$1',[uid])).rows[0].n
 expect((await user('select public.sync_titles() n')).rows[0].n).toBe(0)
 await state()
 expect((await db.query('select count(*)::int n from public.notifications where recipient_id=$1',[uid])).rows[0].n).toBe(before)
 for(const game of ['odd_even','brick','shadow'])await arcadePlays(game,1)
 expect(await earned()).not.toContain('arcade-all-tour')
 await arcadePlays('memory',1)
 expect(await earned()).toContain('arcade-all-tour')
 await arcadePlays('ladder',5)
 expect(await earned()).toContain('arcade-all-first')
})
it('adds ten titles per upper tier and awards prior manual records at the exact boundary',async()=>{
 const additions=(await db.query("select * from public.title_catalog where id like 'expansion-%'")).rows
 for(const tier of [2,3,4])expect(additions.filter(t=>t.tier===tier)).toHaveLength(10)
 for(let i=0;i<99;i++)await log()
 expect(await earned()).not.toContain('expansion-2-manual')
 await log()
 expect(await earned()).toContain('expansion-2-manual')
 expect((await state()).titles.find(t=>t.id==='expansion-3-manual')).toMatchObject({earnedAt:null,description:null,target:null})
 expect((await user("select title_id from public.player_titles where title_id='expansion-2-manual'",[],other)).rows).toEqual([])
})
it('awards intermediate repeat catches at the boundary and keeps the achievement after selling',async()=>{
 const added=(await db.query("select * from public.title_catalog where id like 'intermediate-%' order by id")).rows
 expect(added).toHaveLength(20)
 expect(added.every(t=>t.tier===2)).toBe(true)
 for(let i=0;i<24;i++)await log({kind:'fish',rarity:'common',species:'sand-goby'})
 expect(await earned()).not.toContain('intermediate-familiar-face')
 await log({kind:'fish',rarity:'common',species:'sand-goby'})
 expect(await earned()).toContain('intermediate-familiar-face')
 await db.query('delete from public.player_collectibles where user_id=$1',[uid])
 expect(await earned()).toContain('intermediate-familiar-face')
 expect(await user('select title_id from public.player_titles where user_id=$1',[uid],other)).toMatchObject({rows:[]})
})
it('requires both intermediate conditions and reconsiders prior evidence when the catalog changes',async()=>{
 for(let i=0;i<15;i++)await log({at:`2026-09-${String(i+1).padStart(2,'0')}T12:00:00Z`})
 expect(await earned()).toContain('intermediate-sea-routine')
 expect(await earned()).not.toContain('intermediate-weekly-journal')
 await db.query("delete from public.player_titles where user_id=$1 and title_id='intermediate-sea-routine'",[uid])
 await db.query('delete from app_private.title_dirty where user_id=$1',[uid])
 await db.exec("update public.title_catalog set name=name where id='intermediate-sea-routine'")
 expect((await db.query('select user_id from app_private.title_dirty where user_id=$1',[uid])).rows).toHaveLength(1)
 expect(await earned()).toContain('intermediate-sea-routine')
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
 // Claimed voyage snapshots include kind/rarity for the experience trigger.
 for(const item of items)if(!item.species.kind||!item.species.rarity){
  const species=(await db.query('select id,kind,rarity from public.collectible_species where id=$1',[item.species.id])).rows[0]
  item.species={...species,...item.species}
 }
 let boat=(await db.query('select id from public.harbor_boats where user_id=$1 and vessel_id=$2',[uid,vessel])).rows[0]
 if(!boat)boat=(await db.query('insert into public.harbor_boats(user_id,vessel_id,instance_no) values($1,$2,1) returning id',[uid,vessel])).rows[0]
 // The snapshot trigger derives returns_at from the vessel's actual duration.
 await db.query("insert into public.harbor_voyages(user_id,vessel_id,boat_id,region_id,vessel_snapshot,departed_at,returns_at,claimed_at,result) values($1,$2,$3,$4,$5,now()-(select duration_minutes from public.harbor_vessels where id=$2)*interval '1 minute'-interval '1 hour',now()-interval '1 hour',now(),$6)",[uid,vessel,boat.id,region,{catch_bait_id:bait},{items}])
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
 await db.query("update app_private.prepared_fishing_casts set eligible=true,species_id='god-devouring-leviathan',rarity='mythic',snapshot=app_private.species_payload('god-devouring-leviathan',null),created_at=clock_timestamp()-make_interval(secs=>wait_seconds::double precision+5) where operation_id=$1",[op])
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
 const gifts=(await user('select public.gift_mailbox() s')).rows[0].s.items.filter(g=>g.reward_kind==='gold')
 expect(gifts).toHaveLength(1);const gift=gifts[0]
 expect(gift).toMatchObject({sender_id:null,sender_name:'퐁당섬 운영자',source:'system',reward_kind:'gold',quantity:500,status:'pending'})
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(50000)
 await expect(user('select public.claim_collectible_gift($1)',[gift.id],other)).rejects.toThrow(/GIFT_NOT_FOUND/)
 await expect(user('select app_private.send_welcome_gift($1)',[other])).rejects.toThrow(/permission denied/)
 await user('select public.claim_collectible_gift($1)',[gift.id]);await user('select public.claim_collectible_gift($1)',[gift.id])
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(50500)
 await db.query("update auth.users set raw_user_meta_data=jsonb_build_object('game_nickname','새이름') where id=$1",[uid])
 await user('select public.sync_player_profile()');await user('select public.sync_player_profile()')
 expect((await user('select public.gift_mailbox() s')).rows[0].s.items.filter(g=>g.id===gift.id)).toHaveLength(1)
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

it.each([
 ['challenge-unbroken-reel',12,'fish','common'],
 ['challenge-no-ordinary',5,'fish','rare'],
 ['challenge-fish-interview',3,'fish','epic'],
 ['challenge-gods-in-line',2,'fish','mythic'],
 ['challenge-recycling-day',7,'trash','common'],
])('requires the full uninterrupted manual streak for %s',async(id,n,kind,rarity)=>{
 for(let i=0;i<n-1;i++)await log({kind,rarity,species:'streak'})
 await log({kind,rarity,species:'streak',source:'expedition'})
 expect(await earned()).not.toContain(id)
 await log()
 for(let i=0;i<n-1;i++)await log({kind,rarity,species:'streak'})
 expect(await earned()).not.toContain(id)
 await log({kind,rarity,species:'streak'})
 expect(await earned()).toContain(id)
 await state();await state()
 expect((await db.query('select count(*)::int n from public.notifications where recipient_id=$1 and achievement_id=$2',[uid,id])).rows[0].n).toBe(1)
})
it.each([
 ['challenge-crumb-rebellion','bait_shell_crumbs','rare',30],
 ['challenge-pupa-dream','bait_firefly_pupa','epic',20],
 ['challenge-lightning-twenty','bait_lightning_stardust','epic',20],
 ['challenge-candle-god','bait_starlight_wax','mythic',3],
 ['challenge-cracked-starlight','bait_cracked_star','mythic',5],
 ['challenge-worm-theology','bait','mythic',3],
])('counts only the exact manual bait and grade for %s',async(id,bait,rarity,target)=>{
 await log({kind:'fish',rarity,species:'bait-test',bait,source:'expedition'})
 await log({kind:'fish',rarity,species:'bait-test',bait:'other-bait'})
 await log({kind:'decoration',rarity,species:'bait-test',bait})
 for(let i=0;i<target-1;i++)await log({kind:'fish',rarity,species:'bait-test',bait})
 expect(await earned()).not.toContain(id)
 await log({kind:'fish',rarity,species:'bait-test',bait})
 expect(await earned()).toContain(id)
 expect((await state()).titles.find(t=>t.id===id).description).toBeTruthy()
})
it('counts distinct species, seas, baits and Korea dates rather than repeated catches',async()=>{
 for(let i=0;i<20;i++)await log({kind:'fish',rarity:'mythic',species:'same',region:'pongdang',bait:'bait'})
 const first=(await db.query('select app_private.challenge_title_metrics($1) m',[uid])).rows[0].m
 expect(first).toMatchObject({challenge_mythic_unique:1,challenge_mythic_seas:1,challenge_mythic_baits:1,challenge_days:1})
 for(let i=1;i<20;i++)await log({kind:'fish',rarity:'mythic',species:'unique-'+i,region:'sea-'+i,bait:'bait-'+i})
 expect(await earned()).toEqual(expect.arrayContaining(['challenge-mythic-editor','challenge-mythic-business-trip','challenge-divine-menu']))
 await log({at:'2026-10-19T14:59:59Z'});await log({at:'2026-10-19T15:00:00Z'})
 expect((await db.query('select app_private.challenge_title_metrics($1) m',[uid])).rows[0].m.challenge_days).toBe(2)
 await expect(user('select app_private.challenge_title_metrics($1)',[other])).rejects.toThrow(/permission denied/)
})
it('requires a completed mythic delivery and queues the delivering player only',async()=>{
 const order=(await db.query("select id from app_private.merchant_orders order by day desc,slot limit 1")).rows[0]
 await db.query("update app_private.merchant_orders set items=jsonb_build_array(jsonb_build_object('speciesId','muk-hyeonmu','rarity','mythic','quantity',1,'unitGold',300)) where id=$1",[order.id])
 expect(await earned()).not.toContain('challenge-mythic-parcel')
 await db.query('update app_private.merchant_orders set completed_by=$1,completed_at=clock_timestamp() where id=$2',[uid,order.id])
 await db.exec('delete from app_private.title_dirty')
 await db.query('insert into app_private.merchant_deliveries(user_id,operation_id,order_id,day,gold,collectible_ids) select $1,gen_random_uuid(),id,day,reward_gold,\'{}\'::uuid[] from app_private.merchant_orders where id=$2',[uid,order.id])
 expect((await db.query('select user_id from app_private.title_dirty')).rows).toEqual([{user_id:uid}])
 expect(await earned()).toContain('challenge-mythic-parcel')
 expect((await user('select public.title_state() s',[],other)).rows[0].s.titles.find(t=>t.id==='challenge-mythic-parcel').earnedAt).toBeNull()
})
it('requires two mythic fish in a single claimed harbor voyage, not separate trips or decorations',async()=>{
 await harborCatch('neoul-boat','bait','pongdang',[{id:crypto.randomUUID(),species:{id:'muk-hyeonmu',kind:'fish',rarity:'mythic'}}])
 await harborCatch('neoul-boat','bait','pongdang',[{id:crypto.randomUUID(),species:{id:'muk-hyeonmu',kind:'fish',rarity:'mythic'}},{id:crypto.randomUUID(),species:{id:'fake-decor',kind:'decoration',rarity:'mythic'}}])
 expect(await earned()).not.toContain('challenge-captain-really')
 await harborCatch('neoul-boat','bait','pongdang',[{id:crypto.randomUUID(),species:{id:'muk-hyeonmu',kind:'fish',rarity:'mythic'}},{id:crypto.randomUUID(),species:{id:'muk-hyeonmu',kind:'fish',rarity:'mythic'}}])
 expect(await earned()).toContain('challenge-captain-really')
})
async function preparedFailures(n,reason='minigame',who=uid,finished=true){
 await db.query("insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,rarity,wait_seconds,failure_at,failure_reason,expires_at,finished_at,result) select $1,gen_random_uuid(),'pongdang','bait',true,'orange-clownfish','common',3,4,'escape',now()+interval '1 hour',case when $4 then now() else null end,jsonb_build_object('failure_reason',$3::text) from generate_series(1,$2)",[who,n,reason,finished])
}
it('awards operation failure titles at 10 and 50 without counting chance failures or unfinished casts',async()=>{
 await preparedFailures(9)
 await preparedFailures(20,'escape')
 await preparedFailures(1,'expired')
 await preparedFailures(1,'minigame',other)
 await preparedFailures(1,'minigame',uid,false)
 expect(await earned()).not.toContain('operation-failure-1')
 await preparedFailures(1)
 expect(await earned()).toContain('operation-failure-1')
 await preparedFailures(39)
 expect(await earned()).not.toContain('operation-failure-2')
 await preparedFailures(1)
 expect(await earned()).toContain('operation-failure-2')
 await expect(user('select app_private.everyday_title_metrics($1)',[other])).rejects.toThrow('permission denied')
})
it('counts only direct fishing failures and immediate recovery catches',async()=>{
 for(let i=0;i<29;i++)await log({at:new Date(Date.UTC(2026,9,19,12,0,i)).toISOString()})
 await log({source:'expedition'})
 expect(await earned()).not.toContain('empty-hook')
 await log({at:'2026-10-19T12:01:00Z'})
 expect(await earned()).toContain('empty-hook')
 for(let i=0;i<19;i++){
  await log({at:new Date(Date.UTC(2026,9,20,12,i,0)).toISOString()})
  await log({at:new Date(Date.UTC(2026,9,20,12,i,1)).toISOString(),kind:'fish',rarity:'common',species:'sand-goby'})
  await log({at:new Date(Date.UTC(2026,9,20,12,i,2)).toISOString(),kind:'fish',rarity:'common',species:'sand-goby'})
 }
 expect(await earned()).not.toContain('cast-again')
 await log({at:'2026-10-20T13:00:00Z'})
 await log({at:'2026-10-20T13:00:01Z',kind:'fish',rarity:'common',species:'sand-goby'})
 expect(await earned()).toContain('cast-again')
})
async function post(){return (await db.query("insert into public.board_posts(author_id,title,body) values($1,'바다 이야기','오늘의 바다') returning id",[uid])).rows[0].id}
it('awards board writing titles at 1 and 30 and queues the author',async()=>{
 await db.exec('delete from app_private.title_dirty')
 await post()
 expect((await db.query('select user_id from app_private.title_dirty')).rows).toEqual([{user_id:uid}])
 expect((await user('select public.sync_titles() n')).rows[0].n).toBeGreaterThan(0)
 expect(await earned()).toContain('community-first-word')
 for(let i=0;i<28;i++)await post()
 expect(await earned()).not.toContain('community-storyteller')
 await post();expect(await earned()).toContain('community-storyteller')
})
it('counts other players likes on posts, excluding self votes, dislikes and comments',async()=>{
 const own=await post(),disliked=await post(),commentPost=await post()
 await db.query('insert into public.board_reactions(user_id,post_id,value) values($1,$2,1),($3,$4,-1)',[uid,own,other,disliked])
 const comment=(await db.query("insert into public.board_comments(author_id,post_id,body) values($1,$2,'답글') returning id",[uid,commentPost])).rows[0].id
 await db.query('insert into public.board_reactions(user_id,post_id,comment_id,value) values($1,$2,$3,1)',[other,commentPost,comment])
 expect((await db.query('select app_private.everyday_title_metrics($1) m',[uid])).rows[0].m.community_likes).toBe(0)
 let last
 for(let i=0;i<19;i++){last=await post();await db.query('insert into public.board_reactions(user_id,post_id,value) values($1,$2,1)',[other,last])}
 expect(await earned()).not.toContain('community-empathy')
 await db.exec('delete from app_private.title_dirty')
 await db.query('update public.board_reactions set value=1 where user_id=$1 and post_id=$2',[other,disliked])
 expect((await db.query('select user_id from app_private.title_dirty')).rows).toEqual([{user_id:uid}])
 expect(await earned()).toContain('community-empathy')
 await db.query('delete from public.board_reactions where user_id=$1 and post_id=$2',[other,disliked])
 expect(await earned()).toContain('community-empathy')
 for(let i=0;i<81;i++){last=await post();await db.query('insert into public.board_reactions(user_id,post_id,value) values($1,$2,1)',[other,last])}
 expect(await earned()).toContain('community-heart-angler')
 expect((await user('select public.title_state() s',[],other)).rows[0].s.titles.find(t=>t.id==='community-heart-angler').earnedAt).toBeNull()
})
it('unlocks the three merchant titles only from completed delivery records',async()=>{
 async function delivery(i){
  await db.query("insert into app_private.merchant_days(day) values(date '2020-01-01'+$1::integer) on conflict do nothing",[i])
  const row=(await db.query("insert into app_private.merchant_orders(day,slot,tier,items,base_gold,reward_gold,completed_by,completed_at) values(date '2020-01-01'+$1::integer,1,'small',jsonb_build_array(jsonb_build_object('speciesId','orange-clownfish','quantity',1,'rarity','common')),10,15,$2,now()) returning id,day",[i,uid])).rows[0]
  await db.query("insert into app_private.merchant_deliveries(user_id,operation_id,order_id,day,gold,collectible_ids) values($1,gen_random_uuid(),$2,$3,15,'{}')",[uid,row.id,row.day])
 }
 for(let i=0;i<9;i++)await delivery(i)
 expect(await earned()).not.toContain('merchant-regular')
 await delivery(9);expect(await earned()).toContain('merchant-regular')
 for(let i=10;i<49;i++)await delivery(i)
 expect(await earned()).not.toContain('merchant-trusted')
 await delivery(49);expect(await earned()).toContain('merchant-trusted')
 for(let i=50;i<99;i++)await delivery(i)
 expect(await earned()).not.toContain('merchant-solver')
 await delivery(99);expect(await earned()).toContain('merchant-solver')
})

it('validates the production relic-title smoke fixture',async()=>{await db.exec(readFileSync('tests/fixtures/relic-title-smoke.sql','utf8'))})
