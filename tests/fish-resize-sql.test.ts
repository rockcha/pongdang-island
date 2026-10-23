// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any,tank:string,id:string
const uid='00000000-0000-0000-0000-000000000751',other='00000000-0000-0000-0000-000000000752'
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1),($2)',[uid,other])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 const state=(await db.query('select public.aquarium_state() s')).rows[0].s
 tank=state.tanks[0].id
 id=(await db.query("insert into public.player_collectibles(user_id,species_id,tank_id,position_x,position_y,rotation,scale) values($1,'pinkchin-blenny',$2,.2,.3,15,1) returning id",[uid,tank])).rows[0].id
 await db.exec('set role authenticated')
},60000)
afterAll(async()=>{await db?.close()})
it('saves both limits, changes only scale, and rejects invalid or foreign access',async()=>{
 for(const scale of [.5,2])expect((await db.query('select public.resize_aquarium_fish($1,$2,$3) s',[id,tank,scale])).rows[0].s).toMatchObject({id,scale})
 for(const scale of [.49,2.01,null,'NaN'])await expect(db.query('select public.resize_aquarium_fish($1,$2,$3)',[id,tank,scale])).rejects.toThrow(/INVALID_TRANSFORM/)
 await db.exec('reset role')
 const row=(await db.query('select position_x,position_y,rotation,scale from public.player_collectibles where id=$1',[id])).rows[0]
 expect(Object.fromEntries(Object.entries(row).map(([key,value])=>[key,Number(value)]))).toEqual({position_x:.2,position_y:.3,rotation:15,scale:2})
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await db.exec('set role authenticated')
 await expect(db.query('select public.resize_aquarium_fish($1,$2,1)',[id,tank])).rejects.toThrow(/TANK_NOT_FOUND/)
 await db.exec('reset role;set role anon')
 await expect(db.query('select public.resize_aquarium_fish($1,$2,1)',[id,tank])).rejects.toThrow(/permission denied/)
})
