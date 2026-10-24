// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const ids=Array.from({length:7},()=>crypto.randomUUID())
async function asUser(sql,params=[]){await db.exec('set role authenticated');return db.query(sql,params)}
async function listing(offset=0,limit=20){return (await asUser('select public.player_directory($1,$2) value',[offset,limit])).rows[0].value}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,id]of ids.entries()){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,'Directory'+i])}
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted'),($1,$3,'pending'),($4,$1,'pending')",[ids[0],ids[1],ids[2],ids[3]])
 await db.query("select app_private.award_experience($1,'manual',$2,98980)",[ids[1],crypto.randomUUID()])
},60000)
beforeEach(async()=>{await db.exec('begin');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[0]])})
afterEach(async()=>{await db.exec('rollback');await db.exec('reset role')})
afterAll(async()=>{await db?.close()})
it('lists minimal public display fields without presence, friend codes or XP and paginates deterministically',async()=>{
 const a=await listing(0,2),b=await listing(2,2),last=await listing(6,2)
 expect(a.players).toHaveLength(2);expect(a.hasMore).toBe(true)
 expect(a.players.map(p=>p.id)).toEqual([ids[1],ids[2]])
 expect(b.players.map(p=>p.id)).toEqual([ids[3],ids[4]])
 expect(last.players).toEqual([]);expect(last.hasMore).toBe(false)
 expect(a.players[0]).toMatchObject({level:50,relationship:'friend'})
 expect(a.players[1]).toMatchObject({level:1,relationship:'outgoing'})
 expect(b.players[0].relationship).toBe('incoming')
 expect(b.players[1].relationship).toBe('none')
 expect(Object.keys(a.players[0]).sort()).toEqual(['avatar_path','equipped_title','id','level','nickname','relationship'])
})
it('reuses friendship checks and creates one notification when a directory request is sent',async()=>{
 const sent=await asUser('select public.send_player_friend_request($1) id',[ids[4]])
 expect(sent.rows[0].id).toBeTruthy()
 expect((await listing()).players.find(p=>p.id===ids[4]).relationship).toBe('outgoing')
 await db.exec('reset role')
 expect((await db.query('select count(*)::int n from public.notifications where request_id=$1',[sent.rows[0].id])).rows[0].n).toBe(1)
 await db.exec('savepoint duplicate')
 await expect(asUser('select public.send_player_friend_request($1)',[ids[4]])).rejects.toThrow('RELATIONSHIP_EXISTS')
 await db.exec('rollback to duplicate')
 await expect(asUser('select public.send_player_friend_request($1)',[ids[0]])).rejects.toThrow('CANNOT_FRIEND_SELF')
})
it('denies anonymous access and invalid pages without broadening profile or XP table grants',async()=>{
 await db.exec('savepoint invalid')
 for(const [offset,limit]of [[-1,20],[0,51],[0,0],[100001,20]]){
  await expect(listing(offset,limit)).rejects.toThrow('INVALID_DIRECTORY_PAGE')
  await db.exec('rollback to invalid')
 }
 await db.exec('set role anon')
 await expect(db.query('select public.player_directory()')).rejects.toThrow(/permission denied/)
 await db.exec('rollback to invalid;set role anon')
 await expect(db.query('select public.send_player_friend_request($1)',[ids[4]])).rejects.toThrow(/permission denied/)
 await db.exec('rollback to invalid')
 await db.query("select set_config('request.jwt.claim.sub','',false)")
 await expect(listing()).rejects.toThrow('AUTH_REQUIRED')
 await db.exec('rollback to invalid;set role authenticated')
 await expect(db.query('select * from app_private.player_experience')).rejects.toThrow(/permission denied/)
})
