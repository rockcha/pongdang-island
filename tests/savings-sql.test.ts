// @vitest-environment node
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000000601',other='00000000-0000-0000-0000-000000000602'
async function asUser(uid,sql,params=[]){await db.exec(uid?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,params)}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}}
async function action(kind,account=null,term=null,amount=null,operation=crypto.randomUUID(),uid=owner){return (await asUser(uid,'select public.savings_action($1,$2,$3,$4,$5) s',[kind,operation,account,term,amount])).rows[0].s}
async function state(uid=owner){return (await asUser(uid,'select public.savings_state() s')).rows[0].s}
async function balance(uid=owner){return (await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold}
async function age(id,hours){await db.query("update public.shell_savings set started_at=clock_timestamp()-make_interval(secs=>$2*3600.0)-interval '1 second' where id=$1",[id,hours])}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const uid of [owner,other]){await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.player_wallets(user_id,gold) values($1,500000)',[uid])}},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('truncate public.shell_savings cascade;update public.player_wallets set gold=500000')})
it('enrolls with an immediate first debit and permits only one outstanding account',async()=>{
 const s=await action('open',null,7,1000)
 expect(s.account).toMatchObject({term_days:7,daily_amount:1000,paid_count:1,principal:1000,bonusPercent:30,expectedBonus:2100,expectedPayout:9100,status:'waiting'})
 expect(Date.parse(s.account.maturesAt)-Date.parse(s.account.started_at)).toBe(168*3600000)
 expect(await balance()).toBe(499000)
 await expect(action('open',null,3,500)).rejects.toThrow(/SAVINGS_ALREADY_OPEN/)
 await expect(action('deposit',s.account.id)).rejects.toThrow(/SAVINGS_NOT_DUE/)
 expect(await balance()).toBe(499000)
})
it('calculates every plan bonus on all principal and requires an extra day after the final installment',async()=>{
 for(const [term,rate,payout] of [[3,20,3600],[5,25,6250],[7,30,9100]]){
  const opened=await action('open',null,term,1000),id=opened.account.id
  for(let count=1;count<term;count++){await age(id,count*24);const s=await action('deposit',id);expect(s.account.paid_count).toBe(count+1)}
  const waiting=await state();expect(waiting.account.status).toBe('waiting')
  expect(waiting.account.expectedPayout).toBe(payout)
  await age(id,term*24)
  expect((await state()).account.status).toBe('matured')
  const before=await balance(),closed=await action('withdraw',id)
  expect(closed.account).toBeNull();expect(closed.receipt).toMatchObject({payout,bonus:term*1000*rate/100,closeKind:'matured'})
  expect(await balance()).toBe(before+payout)
 }
})
it('handles exact 24h/48h boundaries and calendar-day transitions by elapsed hours',async()=>{
 const id=(await action('open',null,3,500)).account.id
 await db.query("update public.shell_savings set started_at='2026-10-18T23:59:00+09:00' where id=$1",[id])
 const status=async(value)=>(await db.query('select app_private.savings_payload(a,$2::timestamptz)->>\'status\' status from public.shell_savings a where id=$1',[id,value])).rows[0].status
 expect(await status('2026-10-19T00:00:00+09:00')).toBe('waiting')
 expect(await status('2026-10-19T23:58:59.999999+09:00')).toBe('waiting')
 expect(await status('2026-10-19T23:59:00+09:00')).toBe('due')
 expect(await status('2026-10-20T23:58:59.999999+09:00')).toBe('due')
 expect(await status('2026-10-20T23:59:00+09:00')).toBe('missed')
})
it('returns only paid principal when cancelled, including after all payments but before maturity',async()=>{
 const id=(await action('open',null,3,501)).account.id
 for(let count=1;count<3;count++){await age(id,count*24);await action('deposit',id)}
 const before=await balance(),s=await action('withdraw',id)
 expect(s.receipt).toMatchObject({payout:1503,bonus:0,closeKind:'cancelled'})
 expect(await balance()).toBe(before+1503)
})
it('ends missed plans without catch-up payments and returns exactly the paid principal',async()=>{
 const id=(await action('open',null,7,1000)).account.id
 await age(id,48)
 expect((await state()).account.status).toBe('missed')
 await expect(action('deposit',id)).rejects.toThrow(/SAVINGS_MISSED/)
 expect((await action('withdraw',id)).receipt).toMatchObject({payout:1000,bonus:0,closeKind:'missed'})
 expect(await balance()).toBe(500000)
})
it('retries enrollment, payment and withdrawal without another debit or payout',async()=>{
 const openId=crypto.randomUUID(),initial=await action('open',null,3,1000,openId),id=initial.account.id
 expect((await action('open',null,3,1000,openId)).replayed).toBe(true)
 await expect(action('open',null,3,2000,openId)).rejects.toThrow(/OPERATION_CONFLICT/)
 expect(await balance()).toBe(499000)
 await age(id,24)
 const depositId=crypto.randomUUID()
 await action('deposit',id,null,null,depositId);await action('deposit',id,null,null,depositId)
 expect((await state()).account.paid_count).toBe(2);expect(await balance()).toBe(498000)
 await expect(action('deposit',id)).rejects.toThrow(/SAVINGS_NOT_DUE/)
 const withdrawId=crypto.randomUUID()
 await action('withdraw',id,null,null,withdrawId);await action('withdraw',id,null,null,withdrawId)
 expect(await balance()).toBe(500000)
 // An old opening retry must not reopen the closed plan.
 expect((await action('open',null,3,1000,openId)).account).toBeNull()
 expect((await state()).history).toHaveLength(1)
})
it('enforces amount/term constraints and keeps failed operations atomic',async()=>{
 for(const [term,amount] of [[1,1000],[7,9],[3,5001]])await expect(action('open',null,term,amount)).rejects.toThrow(/INVALID_SAVINGS_PLAN/)
 await db.query('update public.player_wallets set gold=500 where user_id=$1',[owner])
 await expect(action('open',null,3,1000)).rejects.toThrow(/INSUFFICIENT_GOLD/)
 expect((await state()).account).toBeNull()
 const id=(await action('open',null,3,500)).account.id
 await age(id,24)
 await expect(action('deposit',id)).rejects.toThrow(/INSUFFICIENT_GOLD/)
 expect((await state()).account.paid_count).toBe(1)
 await db.query('update public.player_wallets set gold=1000000000 where user_id=$1',[owner])
 await expect(action('withdraw',id)).rejects.toThrow(/GOLD_LIMIT/)
 expect((await state()).account).not.toBeNull()
 await db.query('update public.player_wallets set gold=0 where user_id=$1',[owner])
 expect((await action('withdraw',id)).receipt.payout).toBe(500)
})
it('isolates accounts and denies anonymous access, direct writes, and fabricated withdrawals',async()=>{
 const id=(await action('open',null,3,1000)).account.id
 expect((await state(other)).account).toBeNull()
 expect((await asUser(other,'select * from public.shell_savings')).rows).toHaveLength(0)
 await expect(action('withdraw',id,null,null,crypto.randomUUID(),other)).rejects.toThrow(/SAVINGS_NOT_FOUND/)
 await expect(asUser(owner,'update public.shell_savings set paid_count=term_days')).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,'select * from app_private.savings_operations')).rejects.toThrow(/permission denied/)
 await expect(asUser(null,'select public.savings_state()')).rejects.toThrow(/permission denied/)
 await expect(asUser(null,'select public.savings_action(\'open\',gen_random_uuid(),null,3,500)')).rejects.toThrow(/permission denied/)
 await expect(asUser(null,'select * from public.shell_savings')).rejects.toThrow(/permission denied/)
 expect(await balance(other)).toBe(500000)
})

it('enforces new enrollment bounds and refunds the minimum principal',async()=>{
 for(const amount of [9,5001]) await expect(action('open',null,3,amount)).rejects.toThrow(/INVALID_SAVINGS_PLAN/)
 for(const amount of [10,5000]){
  const opened=await action('open',null,3,amount)
  expect(opened.account.daily_amount).toBe(amount)
  expect((await action('withdraw',opened.account.id)).receipt.payout).toBe(amount)
 }
 expect(await balance()).toBe(500000)
})
