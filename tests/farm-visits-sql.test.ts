// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const viewer=crypto.randomUUID(),owner=crypto.randomUUID(),stranger=crypto.randomUUID(),notStarted=crypto.randomUUID()
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [id,name] of [[viewer,'방문자'],[owner,'친구'],[stranger,'타인'],[notStarted,'미개설친구']]){
  await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name])
 }
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted'),($3,$1,'accepted')",[viewer,owner,notStarted])
 const document={gold:99999,land:['1,1'],paths:['1,1'],pathTiles:{'1,1':'dirt'},landStock:55,stored:['mill'],objects:[{id:1,kind:'warehouse',x:1,y:1,level:2,secret:'hidden'}],simulation:{inventory:{wheat:789},processingJobs:{secret:'hidden'},researchJobs:{secret:'hidden'},cropJobs:{2:{crop:'wheat',readyAt:123,secret:'hidden'}}}}
 for(const uid of [viewer,owner,stranger])await db.query('insert into app_private.topview_farms(user_id,document) values($1,$2)',[uid,document])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[viewer])
},180000)
afterAll(async()=>{await db?.close()})
it('lists only accepted friends who have a farm, without creating farms',async()=>{
 const result=(await db.query('select public.farm_friends() r')).rows[0].r
 expect(result.self.id).toBe(viewer);expect(result.friends.map(f=>f.id)).toEqual([owner])
 expect((await db.query('select count(*)::int n from app_private.topview_farms')).rows[0].n).toBe(3)
})
it('returns visible layout and crops, never private state or arbitrary embedded fields',async()=>{
 const result=(await db.query('select public.friend_farm($1) r',[owner])).rows[0].r
 expect(Object.keys(result).sort()).toEqual(['layout','likeCount','liked','owner','serverNow'])
 expect(Object.keys(result.layout).sort()).toEqual(['cropJobs','land','objects','pathTiles','paths'])
 expect(result.layout.objects[0]).toEqual({id:1,kind:'warehouse',x:1,y:1,level:2})
 expect(result.layout.cropJobs['2']).toEqual({crop:'wheat',readyAt:123})
 expect(JSON.stringify(result)).not.toContain('hidden');expect(JSON.stringify(result)).not.toContain('789');expect(JSON.stringify(result)).not.toContain('99999')
})
it('rejects unauthenticated users, strangers and friends who have not started',async()=>{
 await expect(db.query('select public.friend_farm($1)',[stranger])).rejects.toThrow('FRIENDSHIP_REQUIRED')
 await expect(db.query('select public.set_farm_like($1,true)',[stranger])).rejects.toThrow('FRIENDSHIP_REQUIRED')
 await expect(db.query('select public.friend_farm($1)',[notStarted])).rejects.toThrow('FARM_NOT_FOUND')
 await db.exec("select set_config('request.jwt.claim.sub','',false)")
 await expect(db.query('select public.friend_farm($1)',[owner])).rejects.toThrow('AUTH_REQUIRED')
 await expect(db.query('select public.farm_friends()')).rejects.toThrow('AUTH_REQUIRED')
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[viewer])
})
it('sets likes idempotently, supports removal, and rejects self-likes',async()=>{
 const before=(await db.query('select document,revision from app_private.topview_farms where user_id=$1',[owner])).rows[0]
 for(let i=0;i<2;i++){const r=(await db.query('select public.set_farm_like($1,true) r',[owner])).rows[0].r;expect(r.likeCount).toBe(1);expect(r.liked).toBe(true)}
 for(let i=0;i<2;i++){const r=(await db.query('select public.set_farm_like($1,false) r',[owner])).rows[0].r;expect(r.likeCount).toBe(0);expect(r.liked).toBe(false)}
 await expect(db.query('select public.set_farm_like($1,true)',[viewer])).rejects.toThrow('OWN_FARM')
 expect((await db.query('select document,revision from app_private.topview_farms where user_id=$1',[owner])).rows[0]).toEqual(before)
})
it('exposes scoped RPCs to authenticated callers and keeps private saves and likes inaccessible',async()=>{
 await db.exec('set role authenticated')
 try{
  expect((await db.query('select public.friend_farm($1) r',[owner])).rows[0].r.owner.id).toBe(owner)
  await expect(db.query('select * from app_private.topview_farms')).rejects.toThrow('permission denied')
  await expect(db.query('select * from app_private.farm_likes')).rejects.toThrow('permission denied')
 }finally{await db.exec('reset role')}
 await db.exec('set role anon')
 try{await expect(db.query('select public.friend_farm($1)',[owner])).rejects.toThrow('permission denied');await expect(db.query('select public.farm_friends()')).rejects.toThrow('permission denied')}finally{await db.exec('reset role')}
})
it('revokes access when a friendship is removed',async()=>{
 await db.query("update public.friend_requests set status='removed' where sender_id=$1 and recipient_id=$2",[viewer,owner])
 expect((await db.query('select public.farm_friends() r')).rows[0].r.friends).toEqual([])
 await expect(db.query('select public.friend_farm($1)',[owner])).rejects.toThrow('FRIENDSHIP_REQUIRED')
 await expect(db.query('select public.set_farm_like($1,true)',[owner])).rejects.toThrow('FRIENDSHIP_REQUIRED')
})
