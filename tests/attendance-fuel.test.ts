// @vitest-environment node
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>,today:string
const uid='00000000-0000-0000-0000-000000000071'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);await db.query('insert into auth.users(id) values($1)',[uid]);today=(await db.query<{day:string}>("select ((now() at time zone 'Asia/Seoul')::date)::text as day")).rows[0].day},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('truncate public.attendance_claims,public.player_attendance,public.gold_transactions,public.player_wallets cascade')})
async function claim(){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);return (await db.query<{value:{replayed:boolean;reward:{gold:number;fuel:number;bait_id:string|null}}}>('select public.claim_attendance($1) value',[today])).rows[0].value}finally{await db.exec('reset role')}}
async function seed(day:number){await db.query('insert into public.player_attendance(user_id,last_claim_date,streak) values($1,$2::date-1,$3)',[uid,today,day-1])}
it.each([1,2,3,7,14,21,28])('alternates base rewards on sheet day %i and grants only bait on milestone days',async day=>{
 if(day>1)await seed(day)
 const reward={gold:day%7!==0&&day%2?50:0,fuel:day%7!==0&&day%2===0?1:0,bait_id:day===28?'bait_epic':day%7===0?'bait_first_greeting':null}
 expect(await claim()).toMatchObject({replayed:false,reward})
 expect(await claim()).toMatchObject({replayed:true,reward})
 const wallet=(await db.query<{gold:number;inventory:Record<string,number>}>('select gold,inventory from public.player_wallets where user_id=$1',[uid])).rows[0]
 expect(wallet.gold).toBe(reward.gold);expect(wallet.inventory.fuel??0).toBe(reward.fuel)
 if(reward.bait_id)expect(wallet.inventory[reward.bait_id]).toBe(1)
 expect((await db.query('select * from public.gold_transactions where user_id=$1',[uid])).rows).toHaveLength(reward.gold?1:0)
})
it('allows fuel at the gold cap and atomically rejects the fuel cap',async()=>{
 await seed(2);await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,1000000000,'{\"fuel\":100000}')",[uid])
 await expect(claim()).rejects.toThrow('FUEL_LIMIT')
 expect((await db.query('select * from public.attendance_claims')).rows).toHaveLength(0)
 await db.query("update public.player_wallets set inventory='{\"fuel\":99999}' where user_id=$1",[uid])
 expect(await claim()).toMatchObject({reward:{gold:0,fuel:1}})
})
it('replays a historical even-day gold claim without granting fuel',async()=>{
 await seed(2)
 await db.query('insert into public.attendance_claims(user_id,claim_date,streak,sheet_day,gold) values($1,$2,2,2,50)',[uid,today])
 expect(await claim()).toMatchObject({replayed:true,reward:{gold:50,fuel:0}})
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[uid])).rows[0]).toMatchObject({inventory:{}})
})
it.each([7,14,21,28])('grants only bait on day %i even when gold and fuel are full',async day=>{
 await seed(day)
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,1000000000,'{\"fuel\":100000}')",[uid])
 expect(await claim()).toMatchObject({reward:{gold:0,fuel:0,bait_id:day===28?'bait_epic':'bait_first_greeting'}})
 const wallet=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[uid])).rows[0]
 expect(wallet).toMatchObject({gold:1000000000,inventory:{fuel:100000}})
})
