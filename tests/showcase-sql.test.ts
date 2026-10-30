// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations,migrationFiles} from '../scripts/db/local.mjs'
const owner='00000000-0000-0000-0000-000000007101',other='00000000-0000-0000-0000-000000007102'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
async function asUser(user:string|null,sql:string,args:unknown[]=[]){
 await db.exec(user?'set role authenticated':'set role anon')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);return await db.query(sql,args)}
 finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}
}
async function catchFish(grade:'common'|'rare'|'epic'|'mythic',won=true){
 const operation=crypto.randomUUID()
 await db.query("update public.fishing_baits set common_bp=$1,rare_bp=$2,epic_bp=$3,mythic_bp=$4,success_chance_bp=10000 where id='bait_epic'",['common','rare','epic','mythic'].map(r=>r===grade?10000:0))
 await db.query("update app_private.fishing_bait_balance_profiles set common_bp=$1,rare_bp=$2,epic_bp=$3,mythic_bp=$4,success_chance_bp=10000,night_common_bp=null,night_rare_bp=null where id='bait_epic'",['common','rare','epic','mythic'].map(r=>r===grade?10000:0))
 await asUser(owner,"select public.prepare_fishing('pongdang','bait_epic',$1)",[operation])
 await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '1 minute' where user_id=$1 and operation_id=$2",[owner,operation])
 const result=(await asUser(owner,'select public.finish_fishing($1,$2) r',[operation,won])).rows[0].r
 return {operation,result}
}
async function publish(operation:string,caption='드디어 만났다!',user=owner){return (await asUser(user,'select public.publish_fishing_showcase($1,$2) id',[operation,caption])).rows[0].id}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [index,user] of [owner,other].entries()){
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[user,{game_nickname:'자랑낚시꾼'+index}])
  await asUser(user,'select public.sync_player_profile()')
  await asUser(user,'select public.get_gold_wallet()')
  await db.query(`update public.player_wallets set inventory='{"bait_epic":100}' where user_id=$1`,[user])
  await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang')",[user])
 }
},60000)
afterAll(async()=>await db?.close())
it('lists public reaction identities with filters and pagination without exposing account details',async()=>{
 const id=await publish((await catchFish('epic')).operation)
 await asUser(owner,"select public.react_fishing_showcase($1,'love')",[id])
 await asUser(other,"select public.react_fishing_showcase($1,'sad')",[id])
 const all=(await asUser(other,'select public.showcase_reaction_people($1) r',[id])).rows[0].r
 expect(all.counts).toEqual({love:1,sad:1});expect(all.total).toBe(2)
 expect(all.items.map((p:any)=>p.user_id)).toEqual([owner,other])
 expect(Object.keys(all.items[0]).sort()).toEqual(['avatar_path','nickname','reaction','user_id'])
 const filtered=(await asUser(owner,"select public.showcase_reaction_people($1,'sad') r",[id])).rows[0].r
 expect(filtered.total).toBe(1);expect(filtered.items[0].user_id).toBe(other)
 expect(filtered.counts).toEqual(all.counts)
 expect((await asUser(owner,'select public.showcase_reaction_people($1,null,1) r',[id])).rows[0].r.items).toHaveLength(1)
 await asUser(other,'select public.react_fishing_showcase($1,null)',[id])
 expect((await asUser(owner,"select public.showcase_reaction_people($1,'sad') r",[id])).rows[0].r.total).toBe(0)
 await expect(asUser(null,'select public.showcase_reaction_people($1)',[id])).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,"select public.showcase_reaction_people($1,'fake')",[id])).rejects.toThrow(/INVALID_SHOWCASE/)
 await expect(asUser(owner,'select public.showcase_reaction_people($1,null,-1)',[id])).rejects.toThrow(/INVALID_SHOWCASE/)
 await asUser(owner,'select public.delete_fishing_showcase($1)',[id])
 await expect(asUser(other,'select public.showcase_reaction_people($1)',[id])).rejects.toThrow(/SHOWCASE_NOT_FOUND/)
})
it('publishes verified epic/mythic snapshots without files, preserves first discovery and deduplicates retries',async()=>{
 for(const grade of ['epic','mythic'] as const){
  const {operation,result}=await catchFish(grade),id=await publish(operation)
  expect(await publish(operation,'다른 캡션')).toBe(id)
  const stored=(await db.query('select * from public.fishing_showcase_posts where id=$1',[id])).rows[0]
  expect(stored.species).toEqual(result.attempt.species);expect(stored.rarity).toBe(grade)
  expect(stored.caption).toBe('드디어 만났다!')
  expect(stored.first_discovery).toBe(result.attempt.firstDiscovery);expect(stored.render_version).toBe(1)
  expect(stored).not.toHaveProperty('image_path')
  await asUser(owner,'select public.sell_collectibles($1,$2)',[[result.attempt.collectible_id],crypto.randomUUID()])
  expect((await db.query('select species from public.fishing_showcase_posts where id=$1',[id])).rows[0].species).toEqual(stored.species)
 }
 expect((await db.query("select count(*)::int n from storage.objects where bucket_id='catch-showcases'")).rows[0].n).toBe(0)
})
it('rejects lower grades, failed or unfinished catches, invented practice IDs and another player attempts',async()=>{
 for(const grade of ['common','rare'] as const){const {operation}=await catchFish(grade);await expect(publish(operation)).rejects.toThrow(/CATCH_NOT_SHAREABLE/)}
 await expect(publish((await catchFish('mythic',false)).operation)).rejects.toThrow(/CATCH_NOT_SHAREABLE/)
 const real=await catchFish('epic')
 await expect(publish(real.operation,'도용',other)).rejects.toThrow(/CATCH_NOT_SHAREABLE/)
 await expect(publish(crypto.randomUUID())).rejects.toThrow(/CATCH_NOT_SHAREABLE/)
 const unfinished=crypto.randomUUID()
 await asUser(owner,"select public.prepare_fishing('pongdang','bait_epic',$1)",[unfinished])
 await expect(publish(unfinished)).rejects.toThrow(/CATCH_NOT_SHAREABLE/)
 await asUser(owner,'select public.finish_fishing($1,false)',[unfinished])
})
it('limits captions and lets only the author delete a post',async()=>{
 const {operation}=await catchFish('epic')
 await expect(publish(operation,'가'.repeat(201))).rejects.toThrow(/INVALID_SHOWCASE/)
 const id=await publish(operation,'가'.repeat(200))
 await expect(asUser(other,'select public.delete_fishing_showcase($1)',[id])).rejects.toThrow(/NOT_ALLOWED/)
 expect((await asUser(owner,'select public.delete_fishing_showcase($1) id',[id])).rows[0].id).toBe(id)
})
it('keeps one reaction per player with replacement, cancellation and retry safety',async()=>{
 const {operation}=await catchFish('mythic'),id=await publish(operation)
 for(const reaction of ['celebrate','celebrate','love'])await asUser(other,'select public.react_fishing_showcase($1,$2)',[id,reaction])
 const row=(await asUser(other,'select public.react_fishing_showcase($1,$2) p',[id,'love'])).rows[0].p
 expect(row.reactions).toEqual({love:1});expect(row.my_reaction).toBe('love')
 await asUser(owner,'select public.react_fishing_showcase($1,$2)',[id,'love'])
 expect((await asUser(other,'select public.react_fishing_showcase($1,null) p',[id])).rows[0].p.reactions).toEqual({love:1})
 await expect(asUser(other,"select public.react_fishing_showcase($1,'fake')",[id])).rejects.toThrow(/INVALID_SHOWCASE_REACTION/)
 expect((await asUser(other,'select public.showcase_feed(true) r')).rows[0].r.items).toEqual([])
 await asUser(owner,'select public.delete_fishing_showcase($1)',[id])
 expect((await db.query('select * from public.fishing_showcase_reactions where post_id=$1',[id])).rows).toEqual([])
})
it('saves sad and angry reactions, replaces them and cancels without losing other players reactions',async()=>{
 const {operation}=await catchFish('mythic'),id=await publish(operation)
 await asUser(owner,'select public.react_fishing_showcase($1,$2)',[id,'celebrate'])
 for(const reaction of ['sad','sad','dislike','dislike','angry']){
  const row=(await asUser(other,'select public.react_fishing_showcase($1,$2) p',[id,reaction])).rows[0].p
  expect(row.my_reaction).toBe(reaction)
  expect(row.reactions).toEqual({celebrate:1,[reaction]:1})
  const people=(await asUser(owner,'select public.showcase_reaction_people($1,$2) r',[id,reaction])).rows[0].r
  expect(people.total).toBe(1);expect(people.items[0].reaction).toBe(reaction)
 }
 const row=(await asUser(other,'select public.react_fishing_showcase($1,null) p',[id])).rows[0].p
 expect(row.my_reaction).toBeNull();expect(row.reactions).toEqual({celebrate:1})
})
it('removes upload surfaces and denies anonymous RPCs, forged writes and invalid pagination',async()=>{
 await expect(asUser(null,'select public.showcase_feed()')).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,"insert into public.fishing_showcase_posts(author_id,operation_id,species,rarity,region_name,caught_at) values($1,$2,'{}','mythic','fake',now())",[owner,crypto.randomUUID()])).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,'select public.showcase_feed(false,-1)')).rejects.toThrow(/INVALID_SHOWCASE/)
 const surfaces=(await db.query("select to_regprocedure('public.publish_fishing_showcase(uuid,text,text)') old_publish,to_regprocedure('app_private.showcase_capture_allowed(text)') upload_helper,(select count(*)::int from storage.buckets where id='catch-showcases') buckets,(select count(*)::int from pg_policies where policyname like 'showcase_images_%') policies")).rows[0]
 // Bucket lifecycle belongs to the Storage API; SQL replay retains the empty bucket.
 expect(surfaces).toEqual({old_publish:null,upload_helper:null,buckets:1,policies:0})
 for(const signature of ['public.showcase_feed(boolean,integer)','public.publish_fishing_showcase(uuid,text)','public.react_fishing_showcase(uuid,text)','public.delete_fishing_showcase(uuid)'])expect((await db.query('select prosecdef from pg_proc where oid=$1::regprocedure',[signature])).rows[0].prosecdef).toBe(false)
})
it('preserves existing post metadata and refuses to delete unexpected legacy image files during upgrade',async()=>{
 const migration='20261021120643_storage_free_fishing_showcases.sql',legacy=await createLocalDatabase()
 try{
  for(const file of migrationFiles()){if(file===migration)break;await legacy.exec(readFileSync('supabase/migrations/'+file,'utf8'))}
  await legacy.query('insert into auth.users(id) values($1)',[owner])
  // Current event species may not exist in the historical schema being upgraded.
  const oldSpecies=(await legacy.query('select id from public.collectible_species')).rows.map(row=>row.id)
  const source=(await db.query("select * from app_private.prepared_fishing_casts where user_id=$1 and rarity='epic' and species_id=any($2::text[]) and result #>> '{attempt,species,id}' is not null order by created_at limit 1",[owner,oldSpecies])).rows[0]
  // This historical schema still requires the original 3–5 second waits.
  source.wait_seconds=4
  await legacy.query('insert into app_private.prepared_fishing_casts select (jsonb_populate_record(null::app_private.prepared_fishing_casts,$1::jsonb)).*',[source])
  const id=crypto.randomUUID()
  await legacy.query("insert into public.fishing_showcase_posts(id,author_id,operation_id,image_path,caption,species,rarity,region_name,caught_at) values($1,$2,$3,'legacy.png','남겨둔 순간',$4,'epic','퐁당섬',now())",[id,owner,source.operation_id,source.result.attempt.species])
  await legacy.exec("begin;insert into storage.objects(bucket_id,name) values('catch-showcases','legacy.png')")
  await expect(legacy.exec(readFileSync('supabase/migrations/'+migration,'utf8'))).rejects.toThrow(/SHOWCASE_IMAGES_REQUIRE_REVIEW/)
  await legacy.exec('rollback')
  expect((await legacy.query('select caption from public.fishing_showcase_posts where id=$1',[id])).rows[0].caption).toBe('남겨둔 순간')
  await legacy.exec(readFileSync('supabase/migrations/'+migration,'utf8'))
  const post=(await legacy.query('select * from public.fishing_showcase_posts where id=$1',[id])).rows[0]
  expect(post.caption).toBe('남겨둔 순간');expect(post.species).toEqual(source.result.attempt.species)
  expect(post.first_discovery).toBe(source.result.attempt.firstDiscovery);expect(post).not.toHaveProperty('image_path')
 }finally{await legacy.close()}
},30000)
