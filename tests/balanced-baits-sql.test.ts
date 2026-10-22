// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
const uid='00000000-0000-0000-0000-000000006801'
const honey='bait_halfmoon_honey',snow='bait_snowflake_salt',tail='bait_shooting_star_tail'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec("select app_private.get_gold_wallet();insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang')")
 await db.query('update public.player_wallets set gold=100000,inventory=$1 where user_id=$2',[JSON.stringify({[honey]:200,[snow]:200,[tail]:200}),uid])
},60000)
afterAll(async()=>await db?.close())

it('charges approved prices once per operation and reports fixed success with rod bonuses equipped',async()=>{
 await db.exec('select public.fishing_rod_state()')
 await db.query("insert into public.player_fishing_rods(user_id,rod_id) values($1,'calm')",[uid])
 await db.exec("select public.equip_fishing_rod('calm')")
 for(const [id,price,chance] of [[honey,100,7500],[snow,35,5000],[tail,40,8000]] as const){
  const op=crypto.randomUUID()
  await db.exec('set role authenticated')
  try{
   await db.query('select public.buy_fishing_bait($1,$2)',[id,op])
   await db.query('select public.buy_fishing_bait($1,$2)',[id,op])
  }finally{await db.exec('reset role')}
  expect((await db.query('select delta from public.gold_transactions where operation_id=$1',[op])).rows).toEqual([{delta:-price}])
  expect((await db.query('select app_private.fishing_success_chance_bp($1) automatic,app_private.manual_fishing_success_chance_bp($1) manual',[id])).rows[0]).toEqual({automatic:chance,manual:chance})
 }
})
it('resolves all 10000 grade rolls exactly, including the shared-only bait baseline',async()=>{
 for(const [id,counts] of [[honey,[5000,5000,0,0]],[snow,[8320,1500,150,30]],[tail,[9900,0,0,100]]] as const){
  const rows=(await db.query("select app_private.resolve_regional_fishing($1,'pongdang',n) rarity,count(*)::int n from generate_series(0,9999)n group by rarity",[id])).rows
  for(const [index,rarity] of ['common','rare','epic','mythic'].entries())expect(rows.find(r=>r.rarity===rarity)?.n??0).toBe(counts[index])
 }
},30000)
it('keeps snow pools shared-only in every grade and preserves mythic decorations in the tail pool',async()=>{
 for(const manual of [false,true]){
  for(const rarity of ['common','rare','epic','mythic']){
   const rows=(await db.query("with draws as materialized(select app_private.pick_balanced_bait_collectible('pongdang',$1,$2,true,$3) id from generate_series(1,80)) select s.kind,s.rarity,s.is_native from draws d join public.collectible_species s on s.id=d.id",[rarity,snow,manual])).rows
   expect(rows).toHaveLength(80)
   for(const row of rows){expect(row.rarity).toBe(rarity);expect(row.is_native).toBe(false);expect(['fish','trash']).toContain(row.kind)}
  }
  const trash=(await db.query("with draws as materialized(select app_private.pick_balanced_bait_collectible('pongdang','common',$1,false,$2) id from generate_series(1,80)) select s.kind,s.rarity from draws d join public.collectible_species s on s.id=d.id",[tail,manual])).rows
  expect(trash.every(r=>r.kind==='trash'&&r.rarity==='common')).toBe(true)
 }
 // Deterministic fixture: a mythic decoration must be eligible even with no mythic fish.
 await db.exec('begin')
 try{
  await db.exec("update public.collectible_species set rarity='epic' where kind='fish' and rarity='mythic'")
  const row=(await db.query("select s.kind,s.rarity from public.collectible_species s where s.id=app_private.pick_balanced_bait_collectible('pongdang','mythic',$1)",[tail])).rows[0]
  expect(row).toEqual({kind:'decoration',rarity:'mythic'})
 }finally{await db.exec('rollback')}
})
it('routes manual reservations and automatic draws through strict pools without double consumption',async()=>{
 for(const id of [honey,snow,tail]){
  const rows=(await db.query("with draws as materialized(select app_private.expedition_pick('pongdang',$1,true) id from generate_series(1,120)) select s.kind,s.rarity,s.is_native from draws d join public.collectible_species s on s.id=d.id",[id])).rows
  for(const row of rows){
   if(id===honey){expect(row.kind).toBe('fish');expect(['common','rare']).toContain(row.rarity)}
   if(id===snow){expect(row.is_native).toBe(false);expect(['fish','trash']).toContain(row.kind)}
   if(id===tail)expect(row.rarity==='mythic'||(row.rarity==='common'&&row.kind==='trash')).toBe(true)
  }
  const before=(await db.query('select (inventory->>$1)::int n from public.player_wallets where user_id=$2',[id,uid])).rows[0].n
  for(let i=0;i<12;i++){
   const op=crypto.randomUUID()
   await db.exec('set role authenticated')
   try{
    const first=(await db.query("select public.prepare_fishing('pongdang',$1,$2) p",[id,op])).rows[0].p
    expect((await db.query("select public.prepare_fishing('pongdang',$1,$2) p",[id,op])).rows[0].p).toEqual(first)
    if(first.eligible){
     if(id===honey){expect(first.species.kind).toBe('fish');expect(['common','rare']).toContain(first.rarity)}
     if(id===snow)expect((await db.query('select is_native from public.collectible_species where id=$1',[first.species.id])).rows[0].is_native).toBe(false)
     if(id===tail)expect(first.rarity==='mythic'||(first.rarity==='common'&&first.species.kind==='trash')).toBe(true)
    }
    await db.query('select public.finish_fishing($1,false)',[op])
   }finally{await db.exec('reset role')}
  }
  expect((await db.query('select (inventory->>$1)::int n from public.player_wallets where user_id=$2',[id,uid])).rows[0].n).toBe(before-12)
 }
})
it('never replaces a missing restricted pool and denies direct helper execution',async()=>{
 await db.exec('begin')
 try{
  await db.exec("update public.collectible_species set native_region_id='pongdang' where not is_native and rarity='mythic'")
  await expect(db.query("select app_private.pick_balanced_bait_collectible('pongdang','mythic',$1)",[snow])).rejects.toThrow(/NO_COLLECTIBLE_FOR_REGION/)
 }finally{await db.exec('rollback')}
 const signature='app_private.pick_balanced_bait_collectible(text,public.game_rarity,text,boolean,boolean)'
 for(const role of ['anon','authenticated'])expect((await db.query('select has_function_privilege($1,$2,\'execute\') allowed',[role,signature])).rows[0].allowed).toBe(false)
})
