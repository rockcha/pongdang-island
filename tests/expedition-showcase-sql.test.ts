// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
const owner='00000000-0000-0000-0000-000000008101',other='00000000-0000-0000-0000-000000008102'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
async function publish(source:string,trip:string,item:string,user=owner,caption='A special catch'){
 await db.exec(user?'set role authenticated':'set role anon')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return (await db.query('select public.publish_expedition_showcase($1,$2,$3,$4) id',[source,trip,item,caption])).rows[0].id}
 finally{await db.exec('reset role')}
}
async function fixture(source:'trap'|'harbor',rarity='epic',claimed=true){
 const trip=crypto.randomUUID(),item=crypto.randomUUID()
 const species=(await db.query('select app_private.species_payload(id,null) s from public.collectible_species where rarity=$1 limit 1',[rarity])).rows[0].s
 const result={items:[{id:item,species,firstDiscovery:true,bonus:false}],regionName:'Recorded sea'}
 if(source==='trap')await db.query("insert into public.fishing_expeditions(id,user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at,claimed_at,result) values($1,$2,'dinghy','pongdang','{}','{}',now()+interval '1 hour',case when $3 then now() else null end,$4)",[trip,owner,claimed,result])
 else{
  const boat=(await db.query("insert into public.harbor_boats(user_id,vessel_id,instance_no) values($1,'fishing-raft',$2) returning id",[owner,++boatNumber])).rows[0].id
  await db.query("insert into public.harbor_voyages(id,user_id,vessel_id,boat_id,vessel_snapshot,departed_at,returns_at,claimed_at,result) values($1,$2,'fishing-raft',$3,'{}',now()-interval '2 hours',now()-interval '1 hour',case when $4 then now() else null end,$5)",[trip,owner,boat,claimed,result])
 }
 return {trip,item,species}
}
let boatNumber=0
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [owner,other]){await db.query("insert into auth.users(id,raw_user_meta_data) values($1::uuid,jsonb_build_object('game_nickname','Tester'||right($1::text,4)))",[id]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('select public.sync_player_profile();select public.get_gold_wallet()')}},60000)
afterAll(async()=>await db?.close())
it.each(['trap','harbor'] as const)('publishes a verified %s catch once, preserves its snapshot and works without storage ownership',async source=>{
 const {trip,item,species}=await fixture(source,source==='trap'?'epic':'mythic')
 const id=await publish(source,trip,item)
 expect(await publish(source,trip,item)).toBe(id)
 const post=(await db.query('select * from public.fishing_showcase_posts where id=$1',[id])).rows[0]
 expect(post.species).toEqual(species);expect(post.first_discovery).toBe(true);expect(post.author_id).toBe(owner)
 await expect(publish(source,trip,item,other)).rejects.toThrow('CATCH_NOT_SHAREABLE')
 await expect(publish(source,trip,crypto.randomUUID())).rejects.toThrow('CATCH_NOT_SHAREABLE')
})
it('rejects lower rarities, unfinished trips, invalid source, long captions and anonymous users',async()=>{
 for(const rarity of ['common','rare']){const f=await fixture('trap',rarity);await expect(publish('trap',f.trip,f.item)).rejects.toThrow('CATCH_NOT_SHAREABLE')}
 const f=await fixture('harbor','mythic',false)
 await expect(publish('harbor',f.trip,f.item)).rejects.toThrow('CATCH_NOT_SHAREABLE')
 await expect(publish('fake',f.trip,f.item)).rejects.toThrow('INVALID_SHOWCASE')
 await expect(publish('harbor',f.trip,f.item,owner,'x'.repeat(201))).rejects.toThrow('INVALID_SHOWCASE')
 await expect(publish('harbor',f.trip,f.item,'')).rejects.toThrow(/permission denied/)
})
