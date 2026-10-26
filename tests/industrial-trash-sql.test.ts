// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const ids=['discarded-battery','broken-generator','rusty-cogwheel']
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('registers the three common 3-gold static trash items in every sea with transparent artwork',async()=>{
 const rows=(await db.query('select * from public.collectible_species where id=any($1)',[ids])).rows
 expect(rows).toHaveLength(3)
 for(const row of rows){
  expect(row).toMatchObject({kind:'trash',rarity:'common',sell_price:3,native_region_id:null,movement_type:'fixed',sprite_sheet_path:null,flip_with_direction:false,travel_direction:'both'})
  expect(Number(row.swim_y_min)).toBeGreaterThanOrEqual(.84)
  const regions=(await db.query('select region_id id from public.collectible_habitats where species_id=$1 order by region_id',[row.id])).rows
  expect(regions).toEqual((await db.query('select id from public.regions order by id')).rows)
  expect(readFileSync('assets/storage-upload/new/20261026-032115/'+row.thumbnail_path).subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]))
 }
})
it('uses the requested price in an actual server sale and does not pay twice on retry',async()=>{
 const user=crypto.randomUUID(),op=crypto.randomUUID(),owned=[]
 await db.query('insert into auth.users(id) values($1)',[user])
 await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[user,'Scrap'+user.slice(0,5)])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,0) on conflict(user_id) do update set gold=0',[user])
 for(const id of ids)owned.push((await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[user,id])).rows[0].id)
 await db.exec('set role authenticated')
 try{
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
  const sell=async()=>(await db.query('select public.sell_collectibles($1,$2) result',[owned,op])).rows[0].result
  expect(await sell()).toMatchObject({gold:9,delta:9})
  expect(await sell()).toMatchObject({gold:9})
 }finally{await db.exec('reset role')}
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[user])).rows[0].gold).toBe(9)
})
