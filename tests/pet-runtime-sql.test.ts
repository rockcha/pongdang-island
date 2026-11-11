// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest'
// @ts-expect-error local PostgreSQL replay harness is JavaScript
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {randomUUID} from 'node:crypto'
import {petSpecies,petJobs,petBaits} from '../src/features/pets/pet-catalog'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid='00000000-0000-0000-0000-000000000991',other='00000000-0000-0000-0000-000000000992'
const command=async(c:Record<string,unknown>,id=randomUUID())=>(await db.query('select public.pet_house_command($1,$2) result',[id,c])).rows[0].result
const food=async(n:number,id=randomUUID())=>(await db.query('select public.buy_pet_food($1,$2) result',[id,n])).rows[0].result
const scalar=async(sql:string,args:unknown[]=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},120000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin')
 await db.query('insert into auth.users(id) values($1),($2)',[uid,other])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.query('select app_private.get_gold_wallet()')
 await db.query(`update public.player_wallets set gold=10000,inventory='{"bait_pet_starter":9,"bait_pet_biscuit":9,"bait_pet_macaron":9,"bait":9}' where user_id=$1`,[uid])
 await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id='pongdang'",[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role')})
const adopt=async(species='wave-cat',owner=uid)=>String(await scalar("insert into app_private.owned_pets(user_id,species_id,name) values($1,$2,'친구') returning id",[owner,species]))
it('buys 1–99 food atomically at 50 each and retries without a second charge',async()=>{
 const id=randomUUID(),first=await food(10,id),retry=await food(10,id)
 expect(first.gold).toBe(9500);expect(first.inventory.pet_food).toBe(10);expect(first.delta).toBe(-500)
 expect(retry.gold).toBe(9500);expect(retry.inventory.pet_food).toBe(10);expect(retry.replayed).toBe(true)
 await expect(food(11,id)).rejects.toThrow('OPERATION_CONFLICT')
})
it('rejects invalid quantities and unaffordable purchases without changing the wallet',async()=>{
 for(const n of [0,100,-1]){await db.exec('savepoint attempt');await expect(food(n)).rejects.toThrow('INVALID_QUANTITY');await db.exec('rollback to attempt')}
 await db.query('update public.player_wallets set gold=49 where user_id=$1',[uid]);await db.exec('savepoint attempt')
 await expect(food(1)).rejects.toThrow('INSUFFICIENT_GOLD');await db.exec('rollback to attempt')
 expect(await scalar('select gold from public.player_wallets where user_id=$1',[uid])).toBe(49)
})
it('uses server-timed care, gives +50 food once, and decays stored pets while offline',async()=>{
 const id=await adopt();await command({type:'select',id});await food(2)
 await db.query("update app_private.owned_pets set fullness=50,affection=50,decay_at=clock_timestamp()-interval '20 minutes' where id=$1",[id])
 let s=await command({type:'feed'});expect(s.pets[0].fullness).toBe(48)
 const care=s.care.id
 await db.query("update app_private.pet_houses set care=jsonb_set(care,'{endsAt}','0') where user_id=$1",[uid])
 s=await command({type:'complete-care',id:care});expect(s.food).toBe(1);expect(s.pets[0].fullness).toBe(98)
 s=await command({type:'complete-care',id:care});expect(s.food).toBe(1)
})
it('isolates ownership, forbids test commands and requires same-species enhancement',async()=>{
 const id=await adopt(),foreign=await adopt('wave-cat',other)
 await db.exec('savepoint attempt');await expect(command({type:'select',id:foreign})).rejects.toThrow('PET_NOT_FOUND');await db.exec('rollback to attempt')
 const material=await adopt();await command({type:'enhance',targetId:id,materialId:material,expectedLevel:0})
 expect(await scalar('select level from app_private.owned_pets where id=$1',[id])).toBe(1)
 expect(await scalar('select count(*)::int from app_private.owned_pets where id=$1',[material])).toBe(0)
 await db.exec('savepoint attempt');await expect(command({type:'add-pet',speciesId:'wave-cat'})).rejects.toThrow();await db.exec('rollback to attempt')
})
it('allows one job, snapshots +3% rewards and cancels without pay',async()=>{
 const id=await adopt();await command({type:'select',id});await db.query('update app_private.owned_pets set level=1 where id=$1',[id])
 const s=await command({type:'start-job',jobId:'wave-cat-lost'})
 const p=s.pets.find((p:{id:string})=>p.id===id);expect(p.job.minReward).toBe(139);expect(p.job.maxReward).toBe(170)
 await command({type:'cancel-job',id,runKey:p.job.runId})
 expect(await scalar('select gold from public.player_wallets where user_id=$1',[uid])).toBe(10000)
 expect(await scalar('select job from app_private.owned_pets where id=$1',[id])).toBeNull()
})
it('claims completed job pay once and sells a pet once without leaving the selected pet behind',async()=>{
 const id=await adopt();await command({type:'select',id})
 const state=await command({type:'start-job',jobId:'wave-cat-lost'})
 const reward=state.pets.find((p:{id:string})=>p.id===id).job.reward
 await db.query("update app_private.owned_pets set job=jsonb_set(job,'{endsAt}','0') where id=$1",[id])
 const op=randomUUID(),first=await command({type:'claim-job',id},op),retry=await command({type:'claim-job',id},op)
 expect(first.gold).toBe(10000+reward);expect(retry.gold).toBe(first.gold)
 const sale=randomUUID(),sold=await command({type:'sell',id},sale),replayed=await command({type:'sell',id},sale)
 expect(sold.gold).toBe(first.gold+1000);expect(replayed.gold).toBe(sold.gold);expect(sold.activeId).toBeNull();expect(sold.pets).toHaveLength(0)
})
it('lists all pet baits with absolute odds and replays bulk purchases',async()=>{
 const state=await scalar('select public.fishing_state()') as {baits:{id:string;pet_bp:number;common_bp:number}[]}
 expect(state.baits.find(b=>b.id==='bait_pet_biscuit')).toMatchObject({pet_bp:300,common_bp:8200})
 expect(state.baits.find(b=>b.id==='bait_pet_macaron')).toMatchObject({pet_bp:500,common_bp:8000})
 expect(state.baits.find(b=>b.id==='bait_pet_starter')).toMatchObject({price:120,pet_bp:200,common_bp:7800,rare_bp:1800,epic_bp:180,mythic_bp:20})
 const op=randomUUID();await db.query("select public.buy_fishing_bait_bulk('bait_pet_biscuit',3,$1,200)",[op]);await db.query("select public.buy_fishing_bait_bulk('bait_pet_biscuit',3,$1,200)",[op])
 expect(await scalar("select (inventory->>'bait_pet_biscuit')::int from public.player_wallets where user_id=$1",[uid])).toBe(12)
 const starterOp=randomUUID()
 await db.query("select public.buy_fishing_bait_bulk('bait_pet_starter',5,$1,120)",[starterOp])
 await db.query("select public.buy_fishing_bait_bulk('bait_pet_starter',5,$1,120)",[starterOp])
 expect(await scalar("select (inventory->>'bait_pet_starter')::int from public.player_wallets where user_id=$1",[uid])).toBe(14)
 expect(await scalar('select gold from public.player_wallets where user_id=$1',[uid])).toBe(8800)
})
it.each(petBaits)('$name exposes exactly the configured probabilities and a 100% total',async bait=>{
 const odds=await scalar('select app_private.pet_bait_odds($1)', ['bait_pet_'+bait.id]) as Record<string,number>
 expect(odds).toEqual({pet_bp:bait.petBp,common_bp:bait.commonBp,rare_bp:bait.rareBp,epic_bp:bait.epicBp,mythic_bp:bait.mythicBp})
 expect(Object.values(odds).reduce((a,b)=>a+b,0)).toBe(10000)
 expect(await scalar("select app_private.pet_bait_odds('bait')")).toBeNull()
})
it('uses the starter pouch higher rare range without rerolling into pets or weather rewards',async()=>{
 let seed=0
 for(let i=0;i<2000;i++){seed=-1+i/1000;await db.query('select setseed($1)',[seed]);const roll=Number(await scalar('select random()'));if(roll>=.8&&roll<.85)break}
 await db.query('select setseed($1)',[seed])
 const plan=await scalar("select public.prepare_discovery_fishing('pongdang','bait_pet_starter',$1,false)",[randomUUID()]) as {rarity:string;species:{kind:string}}
 expect(plan.rarity).toBe('rare');expect(plan.species.kind).not.toBe('pet')
})
it('keeps server species/jobs aligned and excludes snack bait from traps',async()=>{
 const species=(await db.query('select definition from app_private.pet_species order by id')).rows.map((r:{definition:unknown})=>r.definition)
 expect(species).toEqual([...petSpecies].sort((a,b)=>a.id.localeCompare(b.id)))
 const jobs=(await db.query('select definition from app_private.pet_jobs order by id')).rows.map((r:{definition:unknown})=>r.definition)
 expect(jobs).toEqual([...petJobs].sort((a,b)=>a.id.localeCompare(b.id)))
 const state=await scalar('select public.expedition_state()') as {baits:{id:string}[]}
 expect(state.baits.some(b=>b.id.startsWith('bait_pet_'))).toBe(false)
})
it.each(petBaits)('$name reserves a pet once, consumes one bait and settles into pets rather than aquarium/gifts',async bait=>{
 let seed=0
 for(let i=0;i<2000;i++){seed=-1+i/1000;await db.query('select setseed($1)',[seed]);if(Number(await scalar('select random()'))<bait.petBp/10000)break}
 await db.query('select setseed($1)',[seed])
 const op=randomUUID(),bid='bait_pet_'+bait.id,plan=await scalar("select public.prepare_discovery_fishing('pongdang',$2,$1,false)",[op,bid]) as {species:{kind:string;id:string}}
 expect(plan.species.kind).toBe('pet')
 const retry=await scalar("select public.prepare_discovery_fishing('pongdang',$2,$1,false)",[op,bid]) as {species:unknown;operation_id:string};expect(retry.species).toEqual(plan.species);expect(retry.operation_id).toBe(op)
 expect(await scalar("select (inventory->>$2)::int from public.player_wallets where user_id=$1",[uid,bid])).toBe(8)
 await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '1 minute' where user_id=$1 and operation_id=$2",[uid,op])
 await db.query('select public.finish_fishing($1,true)',[op]);await db.query('select public.finish_fishing($1,true)',[op])
 expect(await scalar('select count(*)::int from app_private.owned_pets where user_id=$1',[uid])).toBe(1)
 expect(await scalar('select collectible_id from public.fishing_attempts where user_id=$1 and operation_id=$2',[uid,op])).toBeNull()
})
