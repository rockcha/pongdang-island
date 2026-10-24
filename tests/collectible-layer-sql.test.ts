// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000001211',friend='00000000-0000-0000-0000-000000001212'
let tank,foreignTank,items
async function asUser(user,sql,args=[]){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return await db.query(sql,args)}finally{await db.exec('reset role')}}
async function layer(id,value,target=tank){return (await asUser(owner,'select public.set_collectible_display_layer($1,$2,$3) s',[id,target,value])).rows[0].s}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const id of [owner,friend]){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,id===owner?'순서주인':'순서친구'])
  const state=(await asUser(id,'select public.aquarium_state() s')).rows[0].s
  if(id===owner)tank=state.tanks[0].id;else foreignTank=state.tanks[0].id
 }
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[owner,friend])
 items=[]
 for(const kind of ['fish','trash','decoration']){
  const species=(await db.query('select id from public.collectible_species where kind=$1 order by id limit 1',[kind])).rows[0].id
  items.push((await db.query('insert into public.player_collectibles(user_id,species_id,tank_id,position_x,position_y,rotation,scale) values($1,$2,$3,.3,.7,15,1.2) returning *',[owner,species,tank])).rows[0])
 }
},60000)
afterAll(async()=>{await db?.close()})
it('persists each kind of layer, preserves placement, and exposes it to the owner and visiting friend',async()=>{
 for(const [index,item] of items.entries()){
  expect(item.display_layer).toBeNull()
  expect(await layer(item.id,350+index)).toEqual({id:item.id,display_layer:350+index})
  const saved=(await db.query('select * from public.player_collectibles where id=$1',[item.id])).rows[0]
  expect({...saved,display_layer:null}).toEqual(item)
 }
 for(const [user,sql,args] of [[owner,'select public.aquarium_state() s',[]],[friend,'select public.friend_aquarium($1) s',[owner]]]){
  const data=(await asUser(user,sql,args)).rows[0].s
  expect(data.inhabitants.filter(item=>items.some(original=>original.id===item.id)).map(item=>item.display_layer)).toEqual([350,351,352])
 }
 expect(await layer(items[0].id,null)).toEqual({id:items[0].id,display_layer:null})
 expect(await layer(items[0].id,0)).toEqual({id:items[0].id,display_layer:0})
 expect(await layer(items[0].id,800)).toEqual({id:items[0].id,display_layer:800})
})
it('rejects invalid layers and cross-owner updates without changing data',async()=>{
 for(const value of [-1,801,2147483647])await expect(layer(items[0].id,value)).rejects.toThrow('INVALID_LAYER')
 await expect(layer(items[0].id,10,foreignTank)).rejects.toThrow('TANK_NOT_FOUND')
 await expect(asUser(friend,'select public.set_collectible_display_layer($1,$2,10)',[items[0].id,foreignTank])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
 expect((await db.query('select display_layer from public.player_collectibles where id=$1',[items[0].id])).rows[0].display_layer).toBe(800)
 await expect(db.query('update public.player_collectibles set display_layer=801 where id=$1',[items[0].id])).rejects.toThrow('player_collectibles_display_layer_range')
})
it('rejects stored, sold and consumed individuals and blocks anonymous and direct updates',async()=>{
 const item=items[1]
 for(const column of ['sold_at','consumed_at','tank_id']){
  await db.query(`update public.player_collectibles set ${column}=${column==='tank_id'?'null':'now()'} where id=$1`,[item.id])
  await expect(layer(item.id,99)).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  await db.query(`update public.player_collectibles set ${column}=$1 where id=$2`,[column==='tank_id'?tank:null,item.id])
 }
 await expect(asUser(owner,'update public.player_collectibles set display_layer=1 where id=$1',[item.id])).rejects.toThrow('permission denied')
 await expect(db.exec('set role anon; select public.set_collectible_display_layer(null,null,null)')).rejects.toThrow('permission denied')
 await db.exec('reset role')
 await expect(asUser('', 'select public.set_collectible_display_layer(null,null,null)')).rejects.toThrow('AUTH_REQUIRED')
})
