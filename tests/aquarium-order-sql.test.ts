// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations,migrationFiles,readSql} from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000001111',friend='00000000-0000-0000-0000-000000001112'
async function asUser(user,sql,args=[]){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return await db.query(sql,args)}finally{await db.exec('reset role')}}
async function state(){return (await asUser(owner,'select public.aquarium_state() s')).rows[0].s}
async function reorder(ids,expected){return (await asUser(owner,'select public.reorder_aquarium_tanks($1,$2) s',[ids,expected])).rows[0].s}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const id of [owner,friend]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,id===owner?'순서주인':'방문친구']);await asUser(id,'select public.aquarium_state()')}
 await db.query('insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,\'accepted\')',[owner,friend])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,10000) on conflict(user_id) do update set gold=10000',[owner])
 for(let i=0;i<4;i++)await asUser(owner,'select public.buy_aquarium_tank($1)',[crypto.randomUUID()])
},60000)
afterAll(async()=>{await db?.close()})
it('moves the fifth tank to the front for both owner and friend, preserving tank contents and metadata',async()=>{
 const before=await state(),ids=before.tanks.map(t=>t.id),next=[ids[4],...ids.slice(0,4)]
 const first=before.tanks[0]
 await db.query("insert into public.player_collectibles(user_id,species_id,tank_id,position_x,position_y) values($1,(select id from public.collectible_species where kind='decoration' limit 1),$2,.25,.75)",[owner,first.id])
 const items=(await db.query('select * from public.player_collectibles where user_id=$1',[owner])).rows
 const after=await reorder(next,ids)
 expect(after.tanks.map(t=>t.id)).toEqual(next)
 for(const tank of before.tanks){const actual=after.tanks.find(t=>t.id===tank.id);for(const key of ['name','background_id','is_default','created_at'])expect(actual[key]).toEqual(tank[key])}
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[owner])).rows).toEqual(items)
 expect((await asUser(friend,'select public.friend_aquarium($1) s',[owner])).rows[0].s.tanks.map(t=>t.id)).toEqual(next)
 expect((await state()).tanks.map(t=>t.id)).toEqual(next)
 expect((await reorder(next,ids)).tanks.map(t=>t.id)).toEqual(next)
})
it('rejects missing, duplicate, foreign and null IDs without changing the order',async()=>{
 const ids=(await state()).tanks.map(t=>t.id),foreign=(await asUser(friend,'select public.aquarium_state() s')).rows[0].s.tanks[0].id
 for(const invalid of [null,[],ids.slice(1),[...ids.slice(1),ids[1]],[...ids.slice(1),foreign],[...ids.slice(1),null]])await expect(reorder(invalid,ids)).rejects.toThrow('INVALID_TANK_ORDER')
 expect((await state()).tanks.map(t=>t.id)).toEqual(ids)
 await expect(asUser(friend,'select public.reorder_aquarium_tanks($1,$2)',[ids,ids])).rejects.toThrow('INVALID_TANK_ORDER')
 await expect(db.exec('set role anon;select public.reorder_aquarium_tanks(array[]::uuid[],array[]::uuid[])')).rejects.toThrow('permission denied')
 await db.exec('reset role')
})
it('rejects stale edits and appends newly purchased tanks after the reordered list',async()=>{
 const ids=(await state()).tanks.map(t=>t.id),next=[ids[1],ids[0],...ids.slice(2)]
 await reorder(next,ids)
 await expect(reorder([...ids].reverse(),ids)).rejects.toThrow('TANK_ORDER_CHANGED')
 expect((await state()).tanks.map(t=>t.id)).toEqual(next)
 await asUser(owner,'select public.buy_aquarium_tank($1)',[crypto.randomUUID()])
 expect((await state()).tanks.slice(0,5).map(t=>t.id)).toEqual(next)
 await expect(reorder(ids,next)).rejects.toThrow('INVALID_TANK_ORDER')
})
it('backfills an existing multi-tank account in its original order without changing tank metadata',async()=>{
 const old=await createLocalDatabase()
 try{
  for(const file of migrationFiles().filter(f=>f<'20261024023016'))await old.exec(readSql('supabase/migrations/'+file))
  await old.query('insert into auth.users(id) values($1)',[owner])
  await old.query("select set_config('request.jwt.claim.sub',$1,false)",[owner])
  await old.query('select public.aquarium_state()')
  for(let i=0;i<3;i++)await old.query('insert into public.aquarium_tanks(user_id,name) values($1,$2)',[owner,'보존 어항 '+i])
  const before=(await old.query('select * from public.aquarium_tanks where user_id=$1 order by created_at,id',[owner])).rows
  await old.exec(readSql('supabase/migrations/20261024023016_aquarium_tank_display_order.sql'))
  const after=(await old.query('select * from public.aquarium_tanks where user_id=$1 order by display_order,created_at,id',[owner])).rows
  expect(after.map(({display_order,...tank})=>tank)).toEqual(before)
  expect(after.map(t=>t.display_order)).toEqual([0,1,2,3])
 }finally{await old.close()}
},60000)
