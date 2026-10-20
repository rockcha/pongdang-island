// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const me='00000000-0000-0000-0000-000000008801',other='00000000-0000-0000-0000-000000008802'
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [id,name] of [[me,'내계정'],[other,'친구후보']]){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name])
 }
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me])
 await db.query("insert into public.brick_game_runs(user_id,operation_id,seed,engine_version,reward,paid_reward,finished_at) values($1,gen_random_uuid(),1,6,30,30,now())",[other])
 await db.query("insert into app_private.ladder_runs(user_id,operation_id,mode,stake,choice,bridges,payouts,destination,reward) values($1,gen_random_uuid(),'calm',20,0,array_fill(0,array[12]),array[10,15,25,30],0,10)",[other])
 await db.query("insert into public.shadow_game_runs(user_id,operation_id,score,finished_at) values($1,gen_random_uuid(),5,now())",[other])
 await db.query("insert into public.memory_game_runs(user_id,operation_id,elapsed_ms,finished_at) values($1,gen_random_uuid(),10000,now())",[other])
},60000)
afterAll(async()=>{await db?.close()})
it('returns friend identity and relationship in every ranking without altering records',async()=>{
 const code=(await db.query('select friend_code from public.player_profiles where id=$1',[other])).rows[0].friend_code
 for(const status of [null,'pending','accepted']){
  if(status==='pending')await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'pending')",[other,me])
  if(status==='accepted')await db.exec("update public.friend_requests set status='accepted'")
  for(const name of ['brick','ladder','memory','shadow']){
   await db.exec('set role authenticated')
   try{
    const result=(await db.query(`select public.${name}_leaderboard(0) data`)).rows[0].data
    expect(result.total).toBe(1)
    expect(result.rows[0]).toMatchObject({rank:1,nickname:'친구후보',mine:false,userId:other,friendCode:code,friendStatus:status})
   }finally{await db.exec('reset role')}
  }
 }
})
it('keeps anonymous access blocked',async()=>{
 await db.exec('set role anon')
 try{await expect(db.query('select public.ladder_leaderboard(0)')).rejects.toThrow()}
 finally{await db.exec('reset role')}
})
