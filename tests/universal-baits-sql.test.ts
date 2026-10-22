// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
const ids=['bait','bait_epic','bait_forbidden_star','bait_sea_memory','bait_snowflake_salt','bait_special']
const uid='00000000-0000-0000-0000-000000000991'
let db
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
},60000)
afterAll(async()=>{await db?.close()})
it('restricts new dewleaf casts to fish while honoring an older saved universal profile',async()=>{
 const profile=(await db.query("select app_private.fishing_bait_balance_at('bait_safe') p")).rows[0].p
 expect(profile.target_kinds).toEqual(['fish'])
 for(const manual of [false,true]){
  const id=(await db.query("select app_private.pick_profile_collectible('pongdang','common',$1,$2) id",[JSON.stringify(profile),manual])).rows[0].id
  const picked=(await db.query('select kind from public.collectible_species where id=$1',[id])).rows[0]
  expect(picked?.kind).toBe('fish')
 }
 await db.exec('begin')
 try{
  await db.exec("update public.collectible_species set rarity='rare' where kind in ('fish','trash') and rarity='common'")
  expect((await db.query("select app_private.pick_profile_collectible('pongdang','common',$1) id",[JSON.stringify(profile)])).rows[0].id).toBeNull()
  profile.target_kinds=['fish','trash','decoration']
  const previousId=(await db.query("select app_private.pick_profile_collectible('pongdang','common',$1) id",[JSON.stringify(profile)])).rows[0].id
  const previous=(await db.query('select kind from public.collectible_species where id=$1',[previousId])).rows[0]
  expect(previous?.kind).toBe('decoration')
 }finally{await db.exec('rollback')}
})
it('allows decorations through both manual and automatic pools for every formerly fish/trash bait',async()=>{
 for(const id of ids){
  const profile=(await db.query('select app_private.fishing_bait_balance_at($1) p',[id])).rows[0].p
  const rarity=['common','rare','epic','mythic'].find(r=>profile[r+'_bp']>0)
  await db.exec('begin')
  try{
   // Leave only decorations in this grade: eligibility is deterministic, not a lucky sample.
   await db.query("update public.collectible_species set rarity=case when $1='common' then 'rare'::public.game_rarity else 'common'::public.game_rarity end where kind in ('fish','trash') and rarity=$1",[rarity])
   for(const manual of [false,true]){
    const pickedId=(await db.query("select app_private.pick_profile_collectible('pongdang',$1,$2,$3) id",[rarity,JSON.stringify(profile),manual])).rows[0].id
    const picked=(await db.query('select kind,is_native from public.collectible_species where id=$1',[pickedId])).rows[0]
    expect(picked?.kind,id).toBe('decoration')
    if(id==='bait_snowflake_salt')expect(picked.is_native).toBe(false)
   }
  }finally{await db.exec('rollback')}
 }
})
it('keeps saved fish/trash-only runs restricted, including the common-only special rule',async()=>{
 for(const id of ['bait','bait_snowflake_salt']){
  const profile=(await db.query('select app_private.fishing_bait_balance_at($1) p',[id])).rows[0].p
  profile.target_kinds=['fish','trash']
  await db.exec('begin')
  try{
   await db.exec("update public.collectible_species set rarity='rare' where kind in ('fish','trash') and rarity='common'")
   expect((await db.query("select app_private.pick_profile_collectible('pongdang','common',$1) id",[JSON.stringify(profile)])).rows[0].id).toBeNull()
  }finally{await db.exec('rollback')}
 }
})
