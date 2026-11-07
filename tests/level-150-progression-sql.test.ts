// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any
const threshold=(level:number)=>20*(level-1)*(2*level+1)
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('advances earned XP through 100, 101, 150 and 151, reports progress, and grants the level-150 reward once',async()=>{
 await db.exec('begin')
 try{
  const uid=crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'레벨검증')",[uid])
  await db.query('insert into public.player_wallets(user_id,gold) values($1,0) on conflict(user_id) do update set gold=0',[uid])
  await db.query('insert into app_private.player_experience(user_id,total_xp,curve_offset,rewarded_through) values($1,$2,0,99)',[uid,threshold(100)-1])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
  const state=async()=>(await db.query('select public.experience_state() s')).rows[0].s
  const award=async(xp:number,id=crypto.randomUUID())=>{await db.query("select app_private.award_experience($1,'manual',$2,$3)",[uid,id,xp]);return id}
  expect((await state()).level).toBe(99)
  await award(1);expect(await state()).toMatchObject({level:100,currentXp:0,nextLevelXp:8020})
  await award(8020);expect(await state()).toMatchObject({level:101,currentXp:0,nextLevelXp:8100})
  await award(threshold(150)-threshold(101)-1)
  expect(await state()).toMatchObject({level:149,currentXp:11939,nextLevelXp:11940})
  const op=await award(1);await award(1,op)
  expect(await state()).toMatchObject({level:150,totalXp:896980,currentXp:0,nextLevelXp:12020})
  expect((await db.query('select public.player_levels($1::uuid[]) s',[[uid]])).rows[0].s).toEqual([{userId:uid,level:150,levelProgress:0}])
  const gifts=(await db.query("select id,quantity from public.collectible_gifts where recipient_id=$1 and reward_id='level-up:150'",[uid])).rows
  expect(gifts).toHaveLength(1);expect(gifts[0].quantity).toBe(1500)
  await db.exec('set local role authenticated')
  await db.query('select public.claim_collectible_gift($1)',[gifts[0].id]);await db.query('select public.claim_collectible_gift($1)',[gifts[0].id])
  await db.exec('reset role')
  expect(Number((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold)).toBe(1500)
  await award(12020);expect(await state()).toMatchObject({level:151,currentXp:0,nextLevelXp:12100})
 }finally{await db.exec('rollback;reset role')}
},60000)
