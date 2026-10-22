// @vitest-environment node
import {it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

it('restricts piece testing to the verified account and supports unlock, relock and reset',async()=>{
 const db=await createLocalDatabase(),tester=crypto.randomUUID(),other=crypto.randomUUID()
 try{
  await replayMigrations(db)
  await db.query("insert into auth.users(id,email) values($1,'1@1.com'),($2,'other@example.com')",[tester,other])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other])
  await db.exec('set role authenticated')
  await expect(db.query("select public.set_map_piece_test_count('nyamnyam',4)")).rejects.toThrow('TEST_ACCOUNT_REQUIRED')
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[tester])
  await db.exec('set role authenticated')
  const setCount=async(count:number|null)=>(await db.query("select public.set_map_piece_test_count('nyamnyam',$1) r",[count])).rows[0].r
  for(const count of [null,-1,5])await expect(setCount(count)).rejects.toThrow('INVALID_MAP_PIECE_COUNT')
  await expect(db.query("select public.set_map_piece_test_count('coral',1)")).rejects.toThrow('MAP_BLUEPRINT_NOT_FOUND')
  const region=(map:any)=>map.regions.find((r:any)=>r.id==='nyamnyam')
  expect(region(await setCount(2))).toMatchObject({mapPieces:[1,2],unlocked:false})
  expect(region(await setCount(4))).toMatchObject({mapPieces:[1,2,3,4],unlocked:true})
  await db.exec('reset role')
  await db.query("update public.player_navigation set region_id='nyamnyam' where user_id=$1",[tester])
  await db.exec('set role authenticated')
  const relocked=await setCount(1)
  expect(region(relocked)).toMatchObject({mapPieces:[1],unlocked:false})
  expect(relocked.currentRegion).toBe('pongdang')
  expect(region(await setCount(0))).toMatchObject({mapPieces:[],unlocked:false})
  await db.exec('reset role')
  expect((await db.query('select * from public.player_map_fragments where user_id=$1',[other])).rows).toHaveLength(0)
  await db.exec('set role anon')
  await expect(db.query("select public.set_map_piece_test_count('nyamnyam',4)")).rejects.toThrow('permission denied')
 }finally{await db.close()}
},60000)
