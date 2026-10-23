// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const me=crypto.randomUUID(),friend=crypto.randomUUID(),newFriend=crypto.randomUUID(),pending=crypto.randomUUID(),stranger=crypto.randomUUID()
async function call(user=me){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return (await db.query('select public.friend_levels() levels')).rows[0].levels}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const id of [me,friend,newFriend,pending,stranger]){
  await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into public.player_profiles(id,nickname) values($1,'레벨친구')",[id])
 }
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted'),($3,$1,'accepted'),($1,$4,'pending')",[me,friend,newFriend,pending])
 await db.query("select app_private.award_experience($1,'manual',$2,98980)",[friend,crypto.randomUUID()])
 await db.query("select app_private.award_experience($1,'manual',$2,397980)",[stranger,crypto.randomUUID()])
},60000)
beforeEach(async()=>{await db.exec('begin')})
afterEach(async()=>{await db.exec('rollback')})
afterAll(async()=>{await db?.close()})
it('returns only accepted friends in both directions, with level one for an account without XP',async()=>{
 const levels=await call()
 expect(levels).toHaveLength(2)
 expect(levels).toContainEqual({friendId:friend,level:50})
 expect(levels).toContainEqual({friendId:newFriend,level:1})
 expect(levels.every(row=>Object.keys(row).sort().join(',')==='friendId,level')).toBe(true)
 expect(await call(stranger)).toEqual([])
})
it('updates current levels and immediately excludes a removed friendship',async()=>{
 await db.query("select app_private.award_experience($1,'manual',$2,4020)",[friend,crypto.randomUUID()])
 expect(await call()).toContainEqual({friendId:friend,level:51})
 await db.query("update public.friend_requests set status='removed' where sender_id=$1 and recipient_id=$2",[me,friend])
 expect(await call()).toEqual([{friendId:newFriend,level:1}])
})
it('allows authenticated own-friend lookup but denies anonymous access and private XP reads',async()=>{
 await db.exec('savepoint permissions;set role authenticated')
 expect(await call()).toHaveLength(2)
 await expect(db.query('select * from app_private.player_experience')).rejects.toThrow(/permission denied/)
 await db.exec('rollback to permissions;set role anon')
 await expect(call()).rejects.toThrow(/permission denied/)
 await db.exec('rollback to permissions;reset role')
})

it('publishes only levels for known display IDs, deduplicates and bounds batch size',async()=>{
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me])
 const query=async ids=>(await db.query('select public.player_levels($1::uuid[]) levels',[ids])).rows[0].levels
 expect(await query([stranger])).toEqual([])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[stranger])
 await db.query("insert into public.board_posts(author_id,title,body) values($1,'공개 게시글','모두에게 보이는 글입니다.')",[stranger])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me])
 expect(await query([stranger,stranger,newFriend,crypto.randomUUID()])).toEqual(expect.arrayContaining([{userId:stranger,level:100,levelProgress:0},{userId:newFriend,level:1,levelProgress:0}]))
 expect(await query([stranger,stranger])).toEqual([{userId:stranger,level:100,levelProgress:0}])
 expect(await query([])).toEqual([])
 await db.exec('savepoint invalid_batch')
 await expect(query(Array(101).fill(stranger))).rejects.toThrow('INVALID_PLAYER_IDS')
 await db.exec('rollback to invalid_batch;set role anon')
 await expect(query([stranger])).rejects.toThrow(/permission denied/)
 await db.exec('rollback to invalid_batch;reset role')
})

it('does not expose a private-only author by UUID and accepts an explicitly known friend code',async()=>{
 const hidden=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[hidden])
 const profile=(await db.query("insert into public.player_profiles(id,nickname) values($1,'비공개친구') returning friend_code",[hidden])).rows[0]
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[hidden])
 await db.query("insert into public.suggestion_posts(author_id,author_name,title,body,friends_only) values($1,'비공개친구','친구 전용 건의','친구만 보는 건의입니다.',true)",[hidden])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me])
 await db.exec('set role authenticated')
 expect((await db.query('select public.player_levels($1::uuid[]) levels',[[hidden]])).rows[0].levels).toEqual([])
 expect((await db.query('select public.player_levels($1::uuid[],$2::text[]) levels',[[hidden],[profile.friend_code]])).rows[0].levels).toEqual([{userId:hidden,level:1,levelProgress:0}])
 await db.exec('reset role')
})

it('returns half the current level at 130/260 XP and resets at the exact threshold without exposing raw XP',async()=>{
 await db.query("select app_private.award_experience($1,'manual',gen_random_uuid(),410)",[me])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me])
 await db.exec('set role authenticated')
 const query=async()=>(await db.query('select public.player_levels($1::uuid[]) levels',[[me]])).rows[0].levels
 expect(await query()).toEqual([{userId:me,level:3,levelProgress:.5}])
 await db.exec('savepoint private_progress')
 await expect(db.query('select app_private.player_level_progress($1)',[stranger])).rejects.toThrow(/permission denied/)
 await db.exec('rollback to private_progress;reset role')
 await db.query("select app_private.award_experience($1,'manual',gen_random_uuid(),130)",[me])
 expect(await query()).toEqual([{userId:me,level:4,levelProgress:0}])
})
