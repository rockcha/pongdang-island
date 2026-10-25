// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
async function user(sql:string,args:unknown[]=[],id=owner){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return await db.query(sql,args)}finally{await db.exec('reset role')}}
async function act(action='state',id=owner){return (await user('select public.first_fishing_tutorial($1) s',[action],id)).rows[0].s}
async function enroll(id:string,old=false){await db.query("insert into auth.users(id,created_at,raw_user_meta_data) values($1::uuid,case when $2 then now()-interval '1 year' else clock_timestamp() end,jsonb_build_object('game_nickname','User'||right($1::text,6)))",[id,old]);await user('select public.sync_player_profile()',[],id)}
async function catchFish(id:string){await act('start',id);await db.query("update app_private.first_fishing_tutorials set ready_at=clock_timestamp()-interval '1 second' where user_id=$1",[id]);return act('catch',id)}
const owner='00000000-0000-0000-0000-000000009101',other='00000000-0000-0000-0000-000000009102',old='00000000-0000-0000-0000-000000009103'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);await enroll(owner);await enroll(other);await enroll(old,true)},60000)
afterAll(async()=>await db?.close())
it('exempts older Auth accounts even if they create their profile after installation',async()=>{
 expect(await act('state',old)).toMatchObject({required:false,step:'inactive'})
 await expect(act('catch',old)).rejects.toThrow('TUTORIAL_NOT_REQUIRED')
 expect((await db.query('select count(*)::int n from app_private.first_fishing_tutorials where user_id=$1',[old])).rows[0].n).toBe(0)
})
it('persists the stage, requires a cast and enforces the server wait without spending currency or bait',async()=>{
 expect(await act()).toMatchObject({required:true,step:'ready',species:{id:'pongdang-pufferfish'}})
 await expect(act('catch')).rejects.toThrow('TUTORIAL_CAST_REQUIRED')
 await expect(act('place')).rejects.toThrow('TUTORIAL_CATCH_REQUIRED')
 const first=await act('start'),second=await act('start')
 expect(second.readyAt).toBe(first.readyAt)
 expect(await act()).toMatchObject({step:'fishing',readyAt:first.readyAt})
 await expect(act('catch')).rejects.toThrow('TUTORIAL_TOO_EARLY')
 await expect(act('fake')).rejects.toThrow('INVALID_TUTORIAL_ACTION')
})
it('awards exactly one Pongdang pufferfish, records discovery and reuses its ID after retries',async()=>{
 await user('select public.get_gold_wallet()')
 const before=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[owner])).rows[0]
 const caught=await catchFish(owner),retry=await act('catch')
 expect(caught).toMatchObject({required:true,step:'caught',item:{species_id:'pongdang-pufferfish',tank_id:null}})
 expect(retry.item.id).toBe(caught.item.id)
 expect((await act()).item.id).toBe(caught.item.id)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[owner])).rows[0].n).toBe(1)
 expect((await db.query("select count(*)::int n from public.player_discoveries where user_id=$1 and species_id='pongdang-pufferfish'",[owner])).rows[0].n).toBe(1)
 expect((await db.query('select gold,inventory from public.player_wallets where user_id=$1',[owner])).rows[0]).toEqual(before)
})
it('blocks sale, gift, crafting and deletion until that actual collectible is placed',async()=>{
 const state=await act(),item=state.item.id
 await expect(user('select public.sell_collectibles(array[$1::uuid],$2)',[item,crypto.randomUUID()])).rejects.toThrow('FIRST_FRIEND_PLACE_REQUIRED')
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[owner,other])
 await expect(user('select public.send_collectible_gift($1,array[$2::uuid],$3,$4)',[other,item,'hello',crypto.randomUUID()])).rejects.toThrow('FIRST_FRIEND_PLACE_REQUIRED')
 await expect(db.query('update public.player_collectibles set consumed_at=now() where id=$1',[item])).rejects.toThrow('FIRST_FRIEND_PLACE_REQUIRED')
 await expect(db.query('delete from public.player_collectibles where id=$1',[item])).rejects.toThrow('FIRST_FRIEND_PLACE_REQUIRED')
 expect((await act()).step).toBe('caught')
})
it('completes only on a real placement and subsequently allows normal sale without awarding again',async()=>{
 const caught=await act(),placed=await act('place'),retry=await act('place')
 expect(placed).toMatchObject({required:false,step:'completed',item:{id:caught.item.id,tank_id:caught.tank.id}})
 expect(retry.item.id).toBe(caught.item.id)
 await user('select public.sell_collectibles(array[$1::uuid],$2)',[caught.item.id,crypto.randomUUID()])
 expect((await act('catch')).step).toBe('completed')
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[owner])).rows[0].n).toBe(1)
})
it('recognizes placement through the ordinary storage RPC and denies access to others progress',async()=>{
 const caught=await catchFish(other)
 await user('select public.move_collectibles(array[$1::uuid],$2)',[caught.item.id,caught.tank.id],other)
 expect(await act('state',other)).toMatchObject({required:false,step:'completed'})
 await expect(user('select * from app_private.first_fishing_tutorials')).rejects.toThrow(/permission denied/)
 await expect(user("update app_private.first_fishing_tutorials set step='completed'")).rejects.toThrow(/permission denied/)
 await db.exec('set role anon')
 try{await expect(db.query("select public.first_fishing_tutorial('state')")).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
})
it('does not block account deletion while an introductory fish is awaiting placement',async()=>{
 const id=crypto.randomUUID();await enroll(id);await catchFish(id)
 await db.query('delete from auth.users where id=$1',[id])
 expect((await db.query('select count(*)::int n from app_private.first_fishing_tutorials where user_id=$1',[id])).rows[0].n).toBe(0)
})
it('keeps the actual species and identity of a croaker awarded before the tutorial update',async()=>{
 const id=crypto.randomUUID();await enroll(id);await act('start',id)
 const item=(await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'goldfin-croaker') returning id",[id])).rows[0].id
 await db.query("update app_private.first_fishing_tutorials set step='caught',collectible_id=$2,caught_at=clock_timestamp() where user_id=$1",[id,item])
 const state=await act('state',id)
 expect(state).toMatchObject({step:'caught',species:{id:'goldfin-croaker'},item:{id:item,species_id:'goldfin-croaker'}})
 expect((await act('catch',id)).item.id).toBe(item)
 expect(await act('place',id)).toMatchObject({required:false,step:'completed',species:{id:'goldfin-croaker'},item:{id:item}})
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[id])).rows[0].n).toBe(1)
})
