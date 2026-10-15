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
 await db.exec(readFileSync('supabase/sql/31-mistmoon-natives/01-mistmoon-natives.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/32-regional-fishing/01-regional-fishing.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/33-swimming-diver/01-swimming-diver.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/34-remove-ocean-map/01-remove-ocean-map.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/35-collectible-movement/01-collectible-movement.sql','utf8'))
},60000)
afterAll(async()=>{await db.close()})
it('registers coral natives with one habitat and preserves ownership on repeated seeding',async()=>{
 const seed=readFileSync('supabase/sql/38-coral-natives/01-coral-natives.sql','utf8')
 const entries=JSON.parse(readFileSync('assets/storage-upload/new/20261015-133650/species.json','utf8')) as {id:string;kind:string;rarity:string;movement:string}[]
 await db.exec(seed)
 const uid='00000000-0000-0000-0000-000000000998'
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'pinkchin-blenny',.4,.6)",[uid])
 await db.exec(seed)
 const {rows}=await db.query<{id:string;kind:string;rarity:string;is_native:boolean;native_region_id:string;movement_type:string;sprite_sheet_path:string|null;habitats:string[]}>(`select s.id,s.kind,s.rarity,s.is_native,s.native_region_id,s.movement_type,s.sprite_sheet_path,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id`,[entries.map(r=>r.id)])
 expect(rows).toHaveLength(6)
 expect(rows.every(r=>r.is_native&&r.native_region_id==='coral'&&r.habitats.join(',')==='coral')).toBe(true)
 expect(rows.filter(r=>r.rarity==='common')).toHaveLength(2)
 expect(rows.filter(r=>r.rarity==='rare')).toHaveLength(3)
 expect(rows.filter(r=>r.rarity==='epic')).toHaveLength(1)
 expect(rows.find(r=>r.id==='coral-flower-anemone')).toMatchObject({kind:'decoration',movement_type:'fixed',sprite_sheet_path:null})
 expect((await db.query("select position_x::float x,position_y::float y from public.player_collectibles where user_id=$1 and species_id='pinkchin-blenny'",[uid])).rows).toEqual([{x:.4,y:.6}])
 await expect(db.exec("insert into public.collectible_habitats(species_id,region_id) values('pinkchin-blenny','mistmoon')")).rejects.toThrow()
})
it('registers 18 shared species with 9/6/3 rarities and five habitats, repeatably',async()=>{
 const seed=readFileSync('supabase/sql/37-shared-sea-species/01-shared-sea-species.sql','utf8')
 const entries=JSON.parse(readFileSync('assets/storage-upload/new/20261015-124837/species.json','utf8')) as [string,string,string,string,boolean][]
 await db.exec(seed)
 await db.exec(seed)
 const ids=entries.map(row=>row[0])
 const {rows}=await db.query<{id:string;rarity:string;is_native:boolean;movement_type:string;flip_with_direction:boolean;habitats:string[]}>(`select s.id,s.rarity,s.is_native,s.movement_type,s.flip_with_direction,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id`,[ids])
 expect(rows).toHaveLength(18)
 expect(rows.filter(row=>row.rarity==='common')).toHaveLength(9)
 expect(rows.filter(row=>row.rarity==='rare')).toHaveLength(6)
 expect(rows.filter(row=>row.rarity==='epic')).toHaveLength(3)
 expect(rows.every(row=>!row.is_native&&row.habitats.join(',')==='coral,dreamabyss,mistmoon,pongdang,starruins')).toBe(true)
 for(const [id,,,movement,flip] of entries)expect(rows.find(row=>row.id===id)).toMatchObject({movement_type:movement,flip_with_direction:flip})
})
it('initializes existing category behavior and preserves custom settings on repeat',async()=>{
 expect((await db.query("select movement_type,flip_with_direction,travel_direction from public.collectible_species where id='diver-pongdang'")).rows[0]).toEqual({movement_type:'swim',flip_with_direction:true,travel_direction:'both'})
 expect((await db.query("select movement_type,flip_with_direction from public.collectible_species where id='coral-house'")).rows[0]).toEqual({movement_type:'fixed',flip_with_direction:false})
 await db.exec("update public.collectible_species set movement_type='pulse',flip_with_direction=false where id='diver-pongdang'")
 await db.exec(readFileSync('supabase/sql/35-collectible-movement/01-collectible-movement.sql','utf8'))
 expect((await db.query("select movement_type,flip_with_direction from public.collectible_species where id='diver-pongdang'")).rows[0]).toEqual({movement_type:'pulse',flip_with_direction:false})
 await expect(db.exec("update public.collectible_species set movement_type='invalid' where id='diver-pongdang'")).rejects.toThrow(/collectible_movement_type/)
 await expect(db.exec("update public.collectible_species set travel_direction='up' where id='diver-pongdang'")).rejects.toThrow(/collectible_travel_direction/)
})
it('initializes new non-fish rows and resets movement when their actual category changes',async()=>{
 await db.exec("insert into public.collectible_species(id,kind,name,description,size,speed,rarity,thumbnail_path,sell_price) values('movement-example','decoration','예시','설명',52,0,'common','example.png',30)")
 expect((await db.query("select movement_type,flip_with_direction from public.collectible_species where id='movement-example'")).rows[0]).toEqual({movement_type:'fixed',flip_with_direction:false})
 await db.exec("update public.collectible_species set kind='fish',swim_y_min=.2,swim_y_max=.8,speed=.05,sprite_sheet_path='sheet.png' where id='movement-example'")
 expect((await db.query("select movement_type,flip_with_direction from public.collectible_species where id='movement-example'")).rows[0]).toEqual({movement_type:'swim',flip_with_direction:true})
})
it('registers pulse and crawl species with correct native habitats and preserves owned placements on repeat',async()=>{
 const seed=readFileSync('supabase/sql/36-pulse-crawl-species/01-pulse-crawl-species.sql','utf8')
 await db.exec(seed)
 const uid='00000000-0000-0000-0000-000000000999'
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'coral-claw-crab',.4,.9)",[uid])
 await db.exec(seed)
 const {rows}=await db.query<{id:string;kind:string;movement_type:string;flip_with_direction:boolean;native_region_id:string|null;habitats:string[];rarity:string}>("select s.id,s.kind,s.movement_type,s.flip_with_direction,s.native_region_id,s.rarity,array_agg(h.region_id order by h.region_id) as habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id in ('moonbell-jellyfish','peach-umbrella-jellyfish','coral-claw-crab','pebble-hermit-crab') group by s.id")
 expect(rows).toHaveLength(4)
 expect(rows.every(row=>row.kind==='fish'&&!row.flip_with_direction)).toBe(true)
 expect(rows.filter(row=>row.movement_type==='pulse')).toHaveLength(2)
 expect(rows.filter(row=>row.movement_type==='crawl')).toHaveLength(2)
 expect(rows.find(row=>row.id==='moonbell-jellyfish')).toMatchObject({native_region_id:'mistmoon',habitats:['mistmoon'],rarity:'rare'})
 expect(rows.find(row=>row.id==='coral-claw-crab')).toMatchObject({native_region_id:'coral',habitats:['coral'],rarity:'rare'})
 expect(rows.filter(row=>row.native_region_id===null).every(row=>row.habitats.length===5&&row.rarity==='common')).toBe(true)
 expect((await db.query("select position_x::float as x,position_y::float as y from public.player_collectibles where species_id='coral-claw-crab'")).rows).toEqual([{x:.4,y:.9}])
})
