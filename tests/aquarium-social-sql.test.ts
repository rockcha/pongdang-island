// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {readFileSync} from 'node:fs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>,sender:string,recipient:string,other:string
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},180000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('begin');[sender,recipient,other]=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];for(const id of [sender,recipient,other]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into public.player_profiles(id,nickname) values($1::uuid,'소셜검증'||left(($1::uuid)::text,6))",[id])}await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[sender,recipient]);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[sender])})
afterEach(async()=>{await db.exec('rollback')})
async function user(sql:string,args:unknown[]=[]){await db.exec('savepoint request;set local role authenticated');try{return (await db.query(sql,args)).rows[0]?.s}catch(e){await db.exec('rollback to request');throw e}finally{await db.exec('reset role;release savepoint request')}}
async function rejects(work:()=>Promise<unknown>,message:string){await db.exec('savepoint denied');try{await expect(work()).rejects.toThrow(message)}finally{await db.exec('rollback to denied;reset role;release savepoint denied')}}
it('accumulates one like per Korean day, preserves history and prevents unlike or direct writes',async()=>{
 const set=(liked:boolean)=>user('select public.set_aquarium_like($1,$2) s',[recipient,liked])
 expect(await set(true)).toMatchObject({count:1,liked:true});expect(await set(true)).toMatchObject({count:1,liked:true})
 expect(await set(false)).toMatchObject({count:1,liked:true});expect(await set(false)).toMatchObject({count:1,liked:true})
 await db.query("update app_private.aquarium_likes set like_day=(statement_timestamp() at time zone 'Asia/Seoul')::date-1,created_at=created_at-interval '1 day' where owner_id=$1 and visitor_id=$2",[recipient,sender])
 expect(await user('select public.aquarium_like_state($1) s',[recipient])).toMatchObject({count:1,liked:false})
 const next=await set(true);expect(next).toMatchObject({count:2,liked:true});expect(await set(true)).toMatchObject({count:2,liked:true})
 const expected=(await db.query("select (((statement_timestamp() at time zone 'Asia/Seoul')::date+1)::timestamp at time zone 'Asia/Seoul') at_time")).rows[0].at_time
 expect(Date.parse(next.nextLikeAt)).toBe(new Date(expected).getTime())
 await rejects(()=>user('select public.set_aquarium_like($1,true) s',[other]),'FRIENDSHIP_REQUIRED')
 await rejects(()=>user('select * from app_private.aquarium_likes'),'permission denied')
 await db.exec('set local role anon');await rejects(()=>db.query('select public.aquarium_like_state($1)',[recipient]),'permission denied');await db.exec('reset role')
})
it('preserves existing likes and backfills their Korean date during the migration',async()=>{
 await db.exec('alter table app_private.aquarium_likes drop constraint aquarium_likes_pkey;alter table app_private.aquarium_likes drop column like_day;alter table app_private.aquarium_likes add primary key(owner_id,visitor_id)')
 await db.query("insert into app_private.aquarium_likes(owner_id,visitor_id,created_at) values($1,$2,'2020-01-01T16:00:00Z')",[recipient,sender])
 await db.exec(readFileSync(new URL('../supabase/migrations/20261026053216_daily_cumulative_aquarium_likes.sql',import.meta.url),'utf8'))
 expect((await db.query("select like_day::text as day from app_private.aquarium_likes where owner_id=$1",[recipient])).rows).toEqual([{day:'2020-01-02'}])
 expect(await user('select public.aquarium_like_state($1) s',[recipient])).toMatchObject({count:1,liked:false})
 expect(await user('select public.set_aquarium_like($1,true) s',[recipient])).toMatchObject({count:2,liked:true})
})
it('counts different visitors independently and limits each friend separately',async()=>{
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted'),($2,$3,'accepted')",[sender,other,recipient])
 expect(await user('select public.set_aquarium_like($1,true) s',[recipient])).toMatchObject({count:1,liked:true})
 expect(await user('select public.set_aquarium_like($1,true) s',[other])).toMatchObject({count:1,liked:true})
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other])
 expect(await user('select public.aquarium_like_state($1) s',[recipient])).toMatchObject({count:1,liked:false})
 expect(await user('select public.set_aquarium_like($1,true) s',[recipient])).toMatchObject({count:2,liked:true})
})
it('passes the production smoke fixture using synthetic accounts only',async()=>{
 await db.exec(readFileSync(new URL('./fixtures/daily-aquarium-likes-smoke.sql',import.meta.url),'utf8'))
})
it('sends mixed species in one gift, retries once and claims all items without unlocking discoveries',async()=>{
 const species=(await db.query("select distinct on(kind) id,kind from public.collectible_species where kind in ('fish','trash','decoration') order by kind,id")).rows
 const ids:string[]=[];for(const s of species)ids.push((await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[sender,s.id])).rows[0].id)
 const operation=crypto.randomUUID(),send=()=>user('select public.send_collectible_gift($1,$2,$3,$4) s',[recipient,ids,'함께 보내요',operation])
 const gift=await send();expect(gift.quantity).toBe(3);expect(gift.species.bundle_items).toHaveLength(3);expect((await send()).id).toBe(gift.id)
 expect((await db.query('select count(*)::int n from public.collectible_gifts where sender_id=$1 and operation_id=$2',[sender,operation])).rows[0].n).toBe(1)
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[recipient]);const claim=()=>user('select public.claim_collectible_gift($1) s',[gift.id]);expect((await claim()).status).toBe('claimed');await claim()
 expect((await db.query('select id from public.player_collectibles where user_id=$1 and id=any($2) and escrow_gift_id is null and tank_id is null',[recipient,ids])).rows).toHaveLength(3)
 expect((await db.query('select * from public.player_discoveries where user_id=$1',[recipient])).rows).toHaveLength(0)
})
it('rejects a mixed gift atomically if even one item belongs to another account',async()=>{
 const s=(await db.query("select id from public.collectible_species where kind='fish' limit 1")).rows[0].id
 const own=(await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[sender,s])).rows[0].id
 const foreign=(await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[other,s])).rows[0].id
 await rejects(()=>user('select public.send_collectible_gift($1,$2,$3,$4) s',[recipient,[own,foreign],'',crypto.randomUUID()]),'COLLECTIBLE_NOT_FOUND')
 expect((await db.query('select user_id,escrow_gift_id from public.player_collectibles where id=$1',[own])).rows[0]).toEqual({user_id:sender,escrow_gift_id:null})
})
