// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
const migration=readFileSync('supabase/migrations/20261025025948_aquarium_apology_moonlight_shrimp.sql','utf8')
const payload=JSON.parse(readFileSync('assets/notices/20261025-aquarium-gallery/notice.json','utf8'))
const owner='00000000-0000-0000-0000-000000009201',other='00000000-0000-0000-0000-000000009202',later='00000000-0000-0000-0000-000000009203'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
async function asUser(user:string,sql:string,args:any[]=[]){
 await db.exec('set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return await db.query(sql,args)}finally{await db.exec('reset role')}
}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [index,id] of [owner,other,later].entries()){
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{game_nickname:'giftTest'+index}])
  await asUser(id,'select public.sync_player_profile()');await asUser(id,'select public.get_gold_wallet()')
  await db.query('update public.player_profiles set created_at=$1 where id=$2',[id===later?'2026-10-26T00:00:00Z':'2026-10-24T00:00:00Z',id])
 }
 await db.exec(migration)
},60000)
afterAll(async()=>await db?.close())
it('delivers two claimable shrimp to existing players only, with one gift notification each',async()=>{
 const gifts=(await db.query("select * from public.collectible_gifts where source='system' and species->>'id'=$1 order by recipient_id",[payload.gift.campaign])).rows
 expect(gifts).toHaveLength(2)
 expect(gifts.map(g=>g.recipient_id)).toEqual([owner,other])
 for(const gift of gifts){expect(gift).toMatchObject({status:'pending',reward_kind:'bait',reward_id:'bait_special',quantity:2});expect(gift.species.thumbnail_path).toBe('/items/baits/special.png')}
 expect((await db.query('select count(*)::integer n from public.notifications where gift_id=any($1::uuid[])',[gifts.map(g=>g.id)])).rows[0].n).toBe(2)
})
it('claims exactly once and migration replay neither sends duplicates nor credits inventory again',async()=>{
 const gift=(await db.query("select id from public.collectible_gifts where recipient_id=$1 and species->>'id'=$2",[owner,payload.gift.campaign])).rows[0].id
 const balance=async()=>(await db.query("select coalesce((inventory->>'bait_special')::integer,0) n from public.player_wallets where user_id=$1",[owner])).rows[0].n
 const before=await balance()
 await expect(asUser(other,'select public.claim_collectible_gift($1)',[gift])).rejects.toThrow('GIFT_NOT_FOUND')
 await asUser(owner,'select public.claim_collectible_gift($1)',[gift]);await asUser(owner,'select public.claim_collectible_gift($1)',[gift])
 expect(await balance()).toBe(before+2)
 await db.exec(migration)
 expect(await balance()).toBe(before+2)
 expect((await db.query("select count(*)::integer n from public.collectible_gifts where species->>'id'=$1",[payload.gift.campaign])).rows[0].n).toBe(2)
})
it('rejects a malformed system reward with the wrong quantity',async()=>{
 await expect(db.query("insert into public.collectible_gifts(sender_name,recipient_id,recipient_name,operation_id,collectible_ids,species,quantity,source,reward_kind,reward_id) values('operator',$1,'test',gen_random_uuid(),'{}',$2,3,'system','bait','bait_special')",[later,{id:payload.gift.campaign}])).rejects.toThrow(/gift_asset_shape/)
 expect(payload.body).toContain('우편함');expect(payload.body).toContain('혼란');expect(payload.title.length).toBeLessThanOrEqual(100)
})
