// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,expect,it} from 'vitest'
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
},60000)
afterAll(async()=>{await db.close()})
async function invalid(sql:string){try{await expect(db.exec('begin;'+sql+';commit;')).rejects.toThrow(/NATIVE_HABITAT_REQUIRED/)}finally{await db.exec('rollback')}}
it('upgrades rarities without changing existing habitats and repeats safely',async()=>{
 expect((await db.query("select rarity from public.regions where id='mistmoon'")).rows[0]).toEqual({rarity:'rare'})
 expect((await db.query("select rarity,is_native,native_region_id from public.collectible_species where id='coral-house'")).rows[0]).toEqual({rarity:'rare',is_native:false,native_region_id:null})
 expect((await db.query("select count(*)::int as n from public.collectible_habitats where species_id='coral-house'")).rows[0]).toEqual({n:5})
 await db.exec(migration)
})
it('requires exactly one matching native habitat, supports switching regions and removing native status',async()=>{
 await invalid("update public.collectible_species set native_region_id='mistmoon' where id='coral-house'")
 await db.exec("begin;update public.collectible_species set native_region_id='mistmoon' where id='coral-house';delete from public.collectible_habitats where species_id='coral-house' and region_id<>'mistmoon';commit;")
 expect((await db.query("select is_native from public.collectible_species where id='coral-house'")).rows[0]).toEqual({is_native:true})
 await invalid("insert into public.collectible_habitats values('coral-house','coral')")
 await invalid("delete from public.collectible_habitats where species_id='coral-house'")
 await invalid("update public.collectible_habitats set region_id='coral' where species_id='coral-house'")
 await db.exec("begin;update public.collectible_species set native_region_id='coral' where id='coral-house';update public.collectible_habitats set region_id='coral' where species_id='coral-house';commit;")
 await db.exec("update public.collectible_species set native_region_id=null where id='coral-house';insert into public.collectible_habitats values('coral-house','mistmoon')")
})
it.each(['pongul','glass-bottle'])('supports native fish and trash: %s',async(id)=>{
 await db.exec(`begin;update public.collectible_species set native_region_id='mistmoon' where id='${id}';delete from public.collectible_habitats where species_id='${id}' and region_id<>'mistmoon';commit;`)
 expect((await db.query('select is_native from public.collectible_species where id=$1',[id])).rows[0]).toEqual({is_native:true})
})
it('rejects native map templates',async()=>{
 await expect(db.exec("update public.collectible_species set native_region_id='mistmoon' where id='ocean-map'")).rejects.toThrow(/native_collectible_kind/)
})
it('catches a rare mistmoon map and returns native metadata through authenticated APIs',async()=>{
 const uid='00000000-0000-0000-0000-000000000777'
 await db.exec(`insert into auth.users(id) values('${uid}');
  insert into public.player_wallets(user_id,gold,inventory) values('${uid}',100,'{"bait":2}');
  insert into public.player_navigation(user_id,region_id) values('${uid}','pongdang');
  insert into public.player_map_fragments(user_id,region_id) values('${uid}','starruins');
  delete from public.collectible_habitats where species_id in (select id from public.collectible_species where kind='fish' and rarity='rare');
  create or replace function app_private.resolve_fishing(p_bait_id text,p_roll integer) returns public.game_rarity
   language sql stable as $$select 'rare'::public.game_rarity$$;
  set role authenticated;`)
 try{
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  const {rows}=await db.query<{result:{attempt:{rarity:string;species:{rarity:string;map_region_id:string}}}}>("select public.cast_fishing('pongdang','bait',gen_random_uuid()) as result")
  expect(rows[0].result.attempt.rarity).toBe('rare')
  expect(rows[0].result.attempt.species).toMatchObject({rarity:'rare',map_region_id:'mistmoon'})
  const catalog=await db.query<{result:{catalog:{id:string;is_native:boolean;native_region_id:string}[]}}>('select public.collection_state() as result')
  expect(catalog.rows[0].result.catalog.find(item=>item.id==='pongul')).toMatchObject({is_native:true,native_region_id:'mistmoon'})
 }finally{await db.exec('reset role')}
})
it('seeds all six mistmoon natives with one habitat each and preserves ownership on rerun',async()=>{
 const seed=readFileSync('supabase/sql/31-mistmoon-natives/01-mistmoon-natives.sql','utf8')
 await db.exec(seed)
 const uid='00000000-0000-0000-0000-000000000777'
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'silver-mist-goby',.2,.3)",[uid])
 await db.exec(seed)
 const {rows}=await db.query<{kind:string;n:number}>("select kind,count(*)::int as n from public.collectible_species where id in ('hazy-glass-marble','soaked-moonlight-postcard','silver-mist-goby','crescent-seahorse','moon-sleep-waterlily','mist-bell-windchime') and is_native and native_region_id='mistmoon' group by kind order by kind")
 expect(rows).toHaveLength(3)
 expect(rows.every(row=>row.n===2)).toBe(true)
 const habitats=await db.query("select h.species_id,count(*)::int as n,min(h.region_id) as region from public.collectible_habitats h where h.species_id in ('hazy-glass-marble','soaked-moonlight-postcard','silver-mist-goby','crescent-seahorse','moon-sleep-waterlily','mist-bell-windchime') group by h.species_id")
 expect(habitats.rows).toHaveLength(6)
 expect(habitats.rows.every(row=>(row as {n:number;region:string}).n===1&&(row as {region:string}).region==='mistmoon')).toBe(true)
 expect((await db.query("select position_x::float as x,position_y::float as y from public.player_collectibles where species_id='silver-mist-goby'")).rows).toEqual([{x:.2,y:.3}])
})
