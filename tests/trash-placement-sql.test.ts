// @vitest-environment node
import {beforeAll,beforeEach,afterEach,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000000711',other='00000000-0000-0000-0000-000000000712'
let tank:string,item:string
async function user(who:string,sql:string,args:unknown[]=[]){
 await db.exec('savepoint request;set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[who]);return await db.query(sql,args)}
 catch(error){await db.exec('rollback to savepoint request');throw error}
 finally{await db.exec('reset role;release savepoint request')}
}
const arrange=(who=owner,locked=true,x=.4,rotation=75,scale=1.2)=>user(who,'select public.arrange_collectible_with_lock($1,$2,$3,.6,$4,$5,true,$6) value',[item,tank,x,rotation,scale,locked])
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
beforeEach(async()=>{
 await db.exec('begin')
 for(const id of [owner,other]){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,id===owner?'배치주인':'방문자'])
 }
 tank=(await user(owner,'select public.aquarium_state() value')).rows[0].value.tanks[0].id
 item=(await db.query("insert into public.player_collectibles(user_id,species_id,tank_id) values($1,'glass-bottle',$2) returning id",[owner,tank])).rows[0].id
})
afterEach(async()=>{await db.exec('rollback')})
afterAll(async()=>{await db?.close()})
it('persists a trash lock, all transforms and unlocking in subsequent aquarium reads',async()=>{
 expect((await arrange()).rows[0].value).toMatchObject({position_x:.4,position_y:.6,rotation:75,scale:1.2,flipped:true,position_locked:true})
 const state=(await user(owner,'select public.aquarium_state() value')).rows[0].value
 expect(state.inhabitants.find(c=>c.id===item)).toMatchObject({position_x:.4,position_y:.6,rotation:75,scale:1.2,flipped:true,position_locked:true})
 await arrange(owner,false)
 expect((await db.query('select position_locked from public.player_collectibles where id=$1',[item])).rows[0].position_locked).toBe(false)
})
it('drags pinned trash through the position RPC without losing its lock or transform',async()=>{
 await arrange()
 const moved=(await user(owner,'select public.place_collectible($1,$2,.7,.8) value',[item,tank])).rows[0].value
 expect(moved).toMatchObject({position_x:.7,position_y:.8})
 const state=(await user(owner,'select public.aquarium_state() value')).rows[0].value
 expect(state.inhabitants.find(c=>c.id===item)).toMatchObject({position_x:.7,position_y:.8,position_locked:true,rotation:75,scale:1.2,flipped:true})
 await expect(user(other,'select public.place_collectible($1,$2,.1,.2)',[item,tank])).rejects.toThrow('TANK_NOT_FOUND')
})
it('enforces ownership, live tank membership and valid transforms',async()=>{
 await expect(arrange(other)).rejects.toThrow('TANK_NOT_FOUND')
 await expect(arrange(owner,true,-.1)).rejects.toThrow('INVALID_POSITION')
 await expect(arrange(owner,true,.4,361)).rejects.toThrow('INVALID_TRANSFORM')
 await expect(arrange(owner,true,.4,75,3)).rejects.toThrow('INVALID_TRANSFORM')
 await db.query('update public.player_collectibles set tank_id=null where id=$1',[item])
 await expect(arrange()).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
})
it('keeps freely swimming fish ineligible and locks exclusive to trash',async()=>{
 await db.query("update public.player_collectibles set species_id='orange-clownfish' where id=$1",[item])
 await expect(arrange()).rejects.toThrow('INVALID_ITEM')
 await db.query("update public.player_collectibles set species_id='rusty-mini-anchor' where id=$1",[item])
 await expect(arrange()).rejects.toThrow('INVALID_ITEM')
 await expect(arrange(owner,false)).resolves.toBeTruthy()
})
