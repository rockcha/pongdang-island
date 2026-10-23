// @vitest-environment node
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

let db:any
const [me,a,b,stranger]=[9911,9912,9913,9914].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
const tab='10000000-0000-0000-0000-000000000001',second='10000000-0000-0000-0000-000000000002'
async function as(owner:string,sql:string,args:unknown[]=[]){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated')
 try{return (await db.query(sql,args)).rows}finally{await db.exec('reset role')}
}
const ping=(owner:string,state:string,revision:number,session=tab)=>as(owner,'select public.player_presence_ping($1,$2,$3)',[session,state,revision])
const status=async(owner=me)=>(await as(owner,'select public.friend_presence_state() s'))[0].s.friends
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const id of [me,a,b,stranger]){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2) on conflict(id) do nothing',[id,id.slice(-4)])
 }
},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('delete from public.friend_requests;delete from app_private.player_presence_sessions')
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted'),($3,$1,'accepted'),($1,$4,'pending')",[me,a,b,stranger])
})
it('returns only accepted friends in either direction and immediately removes former friends',async()=>{
 await ping(a,'online',1);await ping(b,'away',1);await ping(stranger,'online',1)
 expect(await status()).toEqual([{friend_id:a,state:'online'},{friend_id:b,state:'away'}])
 expect(await status(stranger)).toEqual([])
 await db.query("update public.friend_requests set status='removed' where sender_id=$1 and recipient_id=$2",[me,a])
 expect(await status()).toEqual([{friend_id:b,state:'away'}])
})
it('merges tabs, rejects stale transitions and expires disconnected sessions using server time',async()=>{
 await ping(a,'online',3);await ping(a,'away',2)
 await ping(a,'away',1,second)
 expect((await status())[0].state).toBe('online')
 await ping(a,'offline',4);await ping(a,'online',3)
 expect((await status())[0].state).toBe('away')
 await db.query("update app_private.player_presence_sessions set last_seen_at=clock_timestamp()-interval '91 seconds' where user_id=$1",[a])
 expect((await status())[0].state).toBe('offline')
 await ping(a,'online',5)
 expect((await status())[0].state).toBe('online')
})
it('scopes writes to the caller even when a session ID is reused by someone else',async()=>{
 await ping(a,'online',1);await ping(stranger,'offline',99)
 expect((await status())[0].state).toBe('online')
 expect((await db.query('select user_id from app_private.player_presence_sessions order by user_id')).rows).toEqual([{user_id:a},{user_id:stranger}])
 await expect(as(me,'select * from app_private.player_presence_sessions')).rejects.toThrow(/permission denied/)
 await expect(as(me,"update app_private.player_presence_sessions set state='offline'")).rejects.toThrow(/permission denied/)
})
it('denies anonymous calls and invalid inputs without changing any presence',async()=>{
 for(const args of [[null,'online',1],[tab,null,1],[tab,'playing',1],[tab,'online',0],[tab,'online',null]]){
  await expect(as(me,'select public.player_presence_ping($1,$2,$3)',args)).rejects.toThrow(/INVALID_PRESENCE/)
 }
 await db.exec('set role anon')
 try{
  await expect(db.query('select public.friend_presence_state()')).rejects.toThrow(/permission denied/)
  await expect(db.query('select public.player_presence_ping($1,$2,$3)',[tab,'online',1])).rejects.toThrow(/permission denied/)
 }finally{await db.exec('reset role')}
 expect((await db.query('select count(*)::int n from app_private.player_presence_sessions')).rows[0].n).toBe(0)
})
