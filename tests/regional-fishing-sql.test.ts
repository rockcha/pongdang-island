// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,beforeEach,afterEach,expect,it} from 'vitest'
const db=new PGlite()
const migration=readFileSync('supabase/sql/30-native-collectibles/01-native-collectibles.sql','utf8')
beforeAll(async()=>{
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
  `)

 for(const file of ["01-profiles/01-tables.sql","02-friends/01-tables.sql","03-notifications/01-tables.sql","04-functions/01-social-api.sql","05-realtime/01-publication.sql","06-avatars/01-avatar-storage.sql","07-friend-removal/01-remove-friend.sql","08-gold/01-wallet.sql","09-aquarium/01-backgrounds.sql","10-aquarium-tanks/01-tanks.sql","11-regions/01-regions.sql","12-region-travel/01-travel.sql","13-fishing/01-fishing.sql","14-bait-catalog/01-baits.sql","15-collectibles/01-collectibles.sql","16-cartoon-collectibles/01-cartoon-collectibles.sql","17-collectible-paths/01-paths.sql","22-aquarium-management/01-management.sql","23-collectible-gifts/01-gifts.sql","25-decoration-editing/01-decoration-editing.sql","26-collectible-storage/01-storage.sql","27-new-decorations/01-new-decorations.sql","28-coastal-decorations/01-coastal-decorations.sql","29-statue-decorations/01-statue-decorations.sql"])await db.exec(readFileSync('supabase/sql/'+file,'utf8'))
 await db.exec(migration)
 await db.exec(readFileSync('supabase/sql/31-mistmoon-natives/01-mistmoon-natives.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/32-regional-fishing/01-regional-fishing.sql','utf8'))
},60000)
afterAll(async()=>{await db.close()})
const uid='00000000-0000-0000-0000-000000000888'
beforeEach(async()=>{
 await db.exec(`begin;insert into auth.users(id) values('${uid}');
 insert into public.player_wallets(user_id,gold,inventory) values('${uid}',100,'{"bait":10,"bait_special":10,"bait_epic":10,"bait_magnet":10}');
 insert into public.player_navigation(user_id,region_id) values('${uid}','pongdang');`)
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role;')})
it('preserves failures and guarantees, keeps sums at 10000, and improves upper-tier odds',async()=>{
 for(const bait of ['bait','bait_safe','bait_special','bait_epic']){
  let previous:{common_bp:number;rare_bp:number;epic_bp:number;mythic_bp:number;failure_bp:number}|undefined
  for(const region of ['pongdang','mistmoon','dreamabyss']){
   const {rows}=await db.query<{o:{common_bp:number;rare_bp:number;epic_bp:number;mythic_bp:number;failure_bp:number}}>('select app_private.regional_bait_odds($1,$2) as o',[bait,region])
   const o=rows[0].o
   expect(Object.values(o).reduce((sum,n)=>sum+n,0)).toBe(10000)
   expect(o.failure_bp).toBe(bait==='bait'?5870:bait==='bait_safe'?4696:0)
   if(bait==='bait_special'||bait==='bait_epic')expect(o.common_bp).toBe(0)
   if(bait==='bait_epic')expect(o.rare_bp).toBe(0)
   if(previous){expect(o.mythic_bp).toBeGreaterThan(previous.mythic_bp);if(bait==='bait')expect(o.common_bp).toBeLessThan(previous.common_bp)}
   previous=o
   expect((await db.query('select app_private.resolve_regional_fishing($1,$2,0) as rarity',[bait,region])).rows[0]).toEqual({rarity:'mythic'})
   expect((await db.query('select app_private.resolve_regional_fishing($1,$2,9999) as rarity',[bait,region])).rows[0]).toEqual({rarity:o.failure_bp>0?null:bait==='bait_epic'?'epic':'rare'})
  }
 }
})
it('provides exactly one map per region with matching rarity and a retired legacy template',async()=>{
 const {rows}=await db.query('select s.id,s.rarity=r.rarity as matches from public.regions r join public.collectible_species s on s.id=\'map-\'||r.id')
 expect(rows).toHaveLength(5);expect(rows.every(row=>row.matches)).toBe(true)
 expect((await db.query("select * from public.collectible_habitats where species_id='ocean-map'")).rows).toHaveLength(0)
 const natives=await db.query("select s.is_native,s.native_region_id,count(h.*)::int as n from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.name like '%퐁당%' and s.kind<>'map' group by s.id")
 expect(natives.rows.length).toBeGreaterThanOrEqual(2)
 expect(natives.rows.every(row=>row.is_native&&row.native_region_id==='pongdang'&&row.n===1)).toBe(true)
})
it('uses a separate 5% map gate, excludes unlocked routes, and falls back to fish',async()=>{
 await db.exec(`insert into public.player_map_fragments values('${uid}','starruins',now())`)
 for(const roll of [0,499])expect((await db.query("select * from app_private.pick_regional_collectible('pongdang','rare',false,$1)",[roll])).rows[0]).toEqual({species_id:'map-mistmoon',map_region_id:'mistmoon'})
 expect((await db.query("select * from app_private.pick_regional_collectible('pongdang','rare',false,500)")).rows[0]).toMatchObject({map_region_id:null})
 await db.exec(`insert into public.player_map_fragments values('${uid}','mistmoon',now())`)
 expect((await db.query("select * from app_private.pick_regional_collectible('pongdang','rare',false,0)")).rows[0]).toMatchObject({map_region_id:null})
 expect((await db.query("select * from app_private.pick_regional_collectible('pongdang',null,true,0)")).rows[0]).toMatchObject({map_region_id:null})
})
it('returns effective odds and makes retried casts charge once through the authenticated API',async()=>{
 await db.exec('set role authenticated')
 const state=await db.query<{s:{regionId:string;baits:{id:string;common_bp:number;failure_bp:number}[]}}>('select public.fishing_state() as s')
 expect(state.rows[0].s.regionId).toBe('pongdang')
 expect(state.rows[0].s.baits.find(b=>b.id==='bait')?.failure_bp).toBe(5870)
 const op='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa888'
 const first=await db.query<{r:{replayed:boolean;attempt:unknown}}>("select public.cast_fishing('pongdang','bait',$1) as r",[op])
 const retry=await db.query<{r:{replayed:boolean;attempt:unknown}}>("select public.cast_fishing('pongdang','bait',$1) as r",[op])
 expect(first.rows[0].r.replayed).toBe(false);expect(retry.rows[0].r.replayed).toBe(true)
 expect(retry.rows[0].r.attempt).toEqual(first.rows[0].r.attempt)
 await db.exec('reset role')
 expect((await db.query("select (inventory->>'bait')::int as n from public.player_wallets where user_id=$1",[uid])).rows[0]).toEqual({n:9})
})
it('automatically marks future Pongdang names and preserves legacy maps and unlocks on repeat',async()=>{
 await db.exec("insert into public.collectible_species(id,kind,name,description,speed,size,rarity,thumbnail_path,sell_price) values('future-pongdang','decoration','퐁당 조개 장식','설명',0,52,'common','test.png',30);insert into public.collectible_habitats values('future-pongdang','pongdang');set constraints all immediate;set constraints all deferred;")
 expect((await db.query("select is_native,native_region_id from public.collectible_species where id='future-pongdang'")).rows[0]).toEqual({is_native:true,native_region_id:'pongdang'})
 await db.query("insert into public.player_collectibles(user_id,species_id,map_region_id) values($1,'ocean-map','coral')",[uid])
 await db.query("insert into public.player_map_fragments(user_id,region_id) values($1,'coral')",[uid])
 const sql=readFileSync('supabase/sql/32-regional-fishing/01-regional-fishing.sql','utf8').replace('\nbegin;','\n').replace(/\ncommit;\s*$/,'\n')
 await db.exec(sql)
 expect((await db.query("select * from public.player_collectibles where user_id=$1 and species_id='ocean-map'",[uid])).rows).toHaveLength(1)
 expect((await db.query("select * from public.player_map_fragments where user_id=$1 and region_id='coral'",[uid])).rows).toHaveLength(1)
})
it('upgrades an existing decoration diver and gift snapshot to swimming without removing ownership',async()=>{
 await db.exec("update public.collectible_species set kind='decoration',swim_y_min=null,swim_y_max=null,speed=0,sprite_sheet_path=null,thumbnail_path='decorations/epic/diver-pongdang_thumbnail.png' where id='diver-pongdang'")
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'diver-pongdang',.3,.4)",[uid])
 await db.exec("insert into public.collectible_gifts(sender_id,recipient_id,sender_name,recipient_name,operation_id,collectible_ids,species,quantity,message) values(null,null,'이전 사용자','여행자',gen_random_uuid(),array[gen_random_uuid()],jsonb_build_object('id','diver-pongdang','kind','decoration','thumbnail_path','decorations/epic/diver-pongdang_thumbnail.png'),1,'선물')")
 const sql=readFileSync('supabase/sql/33-swimming-diver/01-swimming-diver.sql','utf8').replace('\nbegin;','\n').replace('\ncommit;','\n')
 await db.exec(sql);await db.exec(sql)
 expect((await db.query("select kind,rarity,speed::float as speed,sprite_sheet_path from public.collectible_species where id='diver-pongdang'")).rows[0]).toEqual({kind:'fish',rarity:'epic',speed:.04,sprite_sheet_path:'fish/epic/diver-pongdang-swimming_sprite.png'})
 expect((await db.query("select position_x::float as x,position_y::float as y from public.player_collectibles where species_id='diver-pongdang'")).rows).toEqual([{x:.3,y:.4}])
 expect((await db.query("select species->>'kind' as kind,species->>'thumbnail_path' as path from public.collectible_gifts where species->>'id'='diver-pongdang'")).rows[0]).toEqual({kind:'fish',path:'fish/epic/diver-pongdang-swimming_thumbnail.png'})
})
it('removes the legacy map while converting valid individuals and preserving unlocks and history',async()=>{
 const item=(await db.query<{id:string}>("insert into public.player_collectibles(user_id,species_id,map_region_id) values($1,'ocean-map','coral') returning id",[uid])).rows[0].id
 const invalid=(await db.query<{id:string}>("insert into public.player_collectibles(user_id,species_id) values($1,'ocean-map') returning id",[uid])).rows[0].id
 await db.query("insert into public.player_map_fragments(user_id,region_id) values($1,'coral')",[uid])
 await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id) values($1,gen_random_uuid(),'pongdang','bait','common',$2),($1,gen_random_uuid(),'pongdang','bait','common',$3)",[uid,item,invalid])
 const sql=readFileSync('supabase/sql/34-remove-ocean-map/01-remove-ocean-map.sql','utf8').replace('\nbegin;','\n').replace('\ncommit;','\n')
 await db.exec(sql);await db.exec(sql)
 expect((await db.query("select * from public.collectible_species where id='ocean-map'")).rows).toHaveLength(0)
 expect((await db.query('select species_id from public.player_collectibles where id=$1',[item])).rows[0]).toEqual({species_id:'map-coral'})
 expect((await db.query('select * from public.player_collectibles where id=$1',[invalid])).rows).toHaveLength(0)
 expect((await db.query('select collectible_id from public.fishing_attempts where user_id=$1',[uid])).rows).toEqual(expect.arrayContaining([{collectible_id:item},{collectible_id:null}]))
 expect((await db.query("select * from public.player_map_fragments where user_id=$1 and region_id='coral'",[uid])).rows).toHaveLength(1)
 expect((await db.query("select * from public.player_discoveries where user_id=$1 and species_id='map-coral'",[uid])).rows).toHaveLength(1)
 expect((await db.query("select * from public.collectible_species where kind='map'")).rows).toHaveLength(5)
})
