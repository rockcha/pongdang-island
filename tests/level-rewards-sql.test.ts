// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
let db
const me=crypto.randomUUID(),other=crypto.randomUUID(),base=(level:number)=>20*(level-1)*(2*level+1)
async function state(user=me){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return (await db.query('select public.experience_state() s')).rows[0].s}
async function award(xp:number,op=crypto.randomUUID(),user=me){await db.query("select app_private.award_experience($1,'manual',$2,$3)",[user,op,xp]);return op}
async function gifts(user=me){return (await db.query("select * from public.collectible_gifts where recipient_id=$1 and reward_id like 'level-up:%' order by created_at,id",[user])).rows}
beforeAll(async()=>{
 db=await createLocalDatabase();const files=migrationFiles(),last=files.find(f=>f.endsWith('_level_curve_and_mailbox_rewards.sql'))
 for(const f of files){if(f===last)break;await db.exec(readSql('supabase/migrations/'+f))}
 for(const id of [me,other]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into public.player_profiles(id,nickname) values($1,'보상낚시꾼')",[id]);await db.query('insert into public.player_wallets(user_id,gold) values($1,10) on conflict(user_id) do update set gold=10',[id])}
 // Lv.40, one-half of the old 2,050 XP bar. Historical awards must stay historical.
 await award(25*39*42+1025)
 const before=await state()
 await db.exec(readSql('supabase/migrations/'+last))
 const after=await state()
 expect(before.level).toBe(40);expect(after).toMatchObject({level:40,currentXp:1610,nextLevelXp:3220,totalXp:before.totalXp})
 expect(await gifts()).toHaveLength(0)
},60000)
beforeEach(async()=>{await db.exec('begin');await state()})
afterEach(async()=>{await db.exec('rollback')})
afterAll(async()=>{await db?.close()})
it('preserves existing progress and pays only the newly reached tier, without changing earned XP history',async()=>{
 const before=await state(),raw=(await db.query('select sum(xp)::bigint xp from app_private.experience_events where user_id=$1',[me])).rows[0].xp
 await award(1610)
 expect(await state()).toMatchObject({level:41,currentXp:0,nextLevelXp:3300,totalXp:before.totalXp+1610})
 const mail=await gifts();expect(mail).toHaveLength(1);expect(mail[0]).toMatchObject({quantity:500,reward_kind:'gold',source:'system',reward_id:'level-up:41',status:'pending'})
 expect(mail[0].species.name).toBe('Lv.41 레벨업 보상')
 expect(Number(raw)).toBe(before.totalXp)
})
it('has exact new curve boundaries and awards every crossed milestone across tier changes',async()=>{
 await award(base(21),undefined,other)
 expect(await state(other)).toMatchObject({level:21,currentXp:0,nextLevelXp:1700})
 const mail=await gifts(other);expect(mail).toHaveLength(20)
 for(const level of [2,10,11,20,21])expect(mail.find(g=>g.reward_id==='level-up:'+level)?.quantity).toBe(100*Math.ceil(level/10))
 expect((await db.query("select count(*)::int n from public.notifications n join public.collectible_gifts g on g.id=n.gift_id where n.recipient_id=$1 and n.kind='gift_received' and g.reward_id like 'level-up:%'",[other])).rows[0].n).toBe(20)
})
it('retries neither add XP nor gifts, and claiming a reward pays gold exactly once to its owner',async()=>{
 const op=await award(100,undefined,other);await award(100,op,other)
 const mail=await gifts(other);expect(mail).toHaveLength(1)
 await state(me);await db.exec('savepoint denied_claim');await expect(db.query('select public.claim_collectible_gift($1)',[mail[0].id])).rejects.toThrow('GIFT_NOT_FOUND');await db.exec('rollback to denied_claim')
 await state(other)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[other])).rows[0].gold).toBe(10)
 await db.query('select public.claim_collectible_gift($1)',[mail[0].id]);await db.query('select public.claim_collectible_gift($1)',[mail[0].id])
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[other])).rows[0].gold).toBe(110)
 expect((await db.query('select count(*)::int n from public.gold_transactions where operation_id=$1',[mail[0].id])).rows[0].n).toBe(1)
})
it('rolls gifts, notifications and XP back together, and denied claims leave the pending reward intact',async()=>{
 await db.exec('savepoint settlement');await award(280,undefined,other);expect(await gifts(other)).toHaveLength(2)
 await db.exec('rollback to settlement');expect(await gifts(other)).toHaveLength(0);expect((await state(other)).totalXp).toBe(0)
 await award(100,undefined,other);const [gift]=await gifts(other)
 await db.query('update public.player_wallets set gold=1000000000 where user_id=$1',[other])
 await db.exec('savepoint wallet_limit');await expect(db.query('select public.claim_collectible_gift($1)',[gift.id])).rejects.toThrow('GOLD_LIMIT');await db.exec('rollback to wallet_limit')
 expect((await gifts(other))[0].status).toBe('pending')
})
it('keeps client-awarded XP, conversion offsets and arbitrary gift inserts inaccessible',async()=>{
 await db.exec('savepoint permission;set role authenticated')
 for(const sql of ["select app_private.award_experience(auth.uid(),'manual',gen_random_uuid(),100)","update app_private.player_experience set curve_offset=999999","insert into public.collectible_gifts default values"]){await expect(db.query(sql)).rejects.toThrow(/permission denied/);await db.exec('rollback to permission;set role authenticated')}
 await db.exec('rollback to permission;reset role')
})
