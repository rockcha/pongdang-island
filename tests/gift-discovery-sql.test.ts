// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db,sid
const sender='00000000-0000-0000-0000-000000009811',recipient='00000000-0000-0000-0000-000000009812'
async function asUser(uid,sql,args=[]){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);return await db.query(sql,args)}finally{await db.exec('reset role')}}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [id,name] of [[sender,'보낸친구'],[recipient,'받은친구']]){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name])
 }
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[sender,recipient])
 sid=(await db.query("select id from public.collectible_species where kind='fish' and rarity='common' order by id limit 1")).rows[0].id
},60000)
afterAll(async()=>{await db?.close()})
it('keeps gift ownership and retries without unlocking the collection, then allows a first real catch',async()=>{
 const item=(await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[sender,sid])).rows[0].id
 await db.query('insert into public.player_discoveries(user_id,species_id) values($1,$2)',[sender,sid])
 const gift=(await asUser(sender,"select public.send_collectible_gift($1,$2,'',$3) g",[recipient,[item],crypto.randomUUID()])).rows[0].g
 await expect(asUser(sender,'select public.claim_collectible_gift($1)',[gift.id])).rejects.toThrow(/GIFT_NOT_FOUND/)
 for(let i=0;i<2;i++)await asUser(recipient,'select public.claim_collectible_gift($1)',[gift.id])
 expect((await db.query('select user_id,escrow_gift_id,tank_id from public.player_collectibles where id=$1',[item])).rows[0]).toEqual({user_id:recipient,escrow_gift_id:null,tank_id:null})
 const state=(await asUser(recipient,'select public.collection_state() s')).rows[0].s
 expect(state.items.some(i=>i.id===item)).toBe(true)
 expect(state.catalog.find(s=>s.id===sid).discovered).toBe(false)
 expect((await db.query('select count(*)::int n from public.player_discoveries where user_id=$1',[sender])).rows[0].n).toBe(1)
 await db.query("update public.player_wallets set inventory='{\"bait_cloud_dough\":2}' where user_id=$1",[recipient])
 await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang')",[recipient])
 const op=crypto.randomUUID()
 await asUser(recipient,"select public.prepare_fishing('pongdang','bait_cloud_dough',$1)",[op])
 await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '30 seconds',species_id=$1,snapshot=app_private.species_payload($1,null) where operation_id=$2",[sid,op])
 const result=(await asUser(recipient,'select public.finish_fishing($1,true) r',[op])).rows[0].r
 expect(result.attempt.firstDiscovery).toBe(true)
 expect((await asUser(recipient,'select public.collection_state() s')).rows[0].s.catalog.find(s=>s.id===sid).discovered).toBe(true)
})
