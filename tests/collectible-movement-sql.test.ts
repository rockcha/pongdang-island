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

it('rebalances shared habitats and removes unused decorations without losing owned placements',async()=>{
 await db.exec(readFileSync('supabase/sql/36-pulse-crawl-species/01-pulse-crawl-species.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/38-coral-natives/01-coral-natives.sql','utf8'))
 const sql=readFileSync('supabase/sql/40-habitat-rebalance/01-habitat-rebalance.sql','utf8')
 await db.exec(sql)
 await db.exec(sql)
 const {rows}=await db.query<{id:string;is_native:boolean;habitats:string[]}>(`select s.id,s.is_native,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id in ('silver-mist-goby','hazy-glass-marble','crescent-seahorse','coral-bean-shrimp','coral-claw-crab') group by s.id`)
 expect(rows).toHaveLength(5)
 const plan:Record<string,string[]>={'silver-mist-goby':['mistmoon','pongdang'],'hazy-glass-marble':['coral','mistmoon','pongdang'],'crescent-seahorse':['coral','mistmoon'],'coral-bean-shrimp':['coral','pongdang'],'coral-claw-crab':['coral','pongdang']}
 for(const row of rows){expect(row.is_native).toBe(false);expect(row.habitats).toEqual(plan[row.id])}
 expect((await db.query("select id from public.collectible_species where id in ('moon-sleep-waterlily','mist-bell-windchime')")).rows).toHaveLength(0)
 expect((await db.query("select position_x::float as x,position_y::float as y from public.player_collectibles where species_id='coral-claw-crab'")).rows).toEqual([{x:.4,y:.9}])
})

it('adds right-facing epic sharks and whales and mythic explorer only to pongdang',async()=>{
 await db.exec(readFileSync('supabase/sql/37-shared-sea-species/01-shared-sea-species.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/39-artwork-facing/01-artwork-facing.sql','utf8'))
 const sql=readFileSync('supabase/sql/41-pongdang-natives/01-pongdang-natives.sql','utf8')
 await db.exec(sql)
 await db.exec(sql)
 const {rows}=await db.query<{id:string;rarity:string;is_native:boolean;facing_direction:string;habitats:string[]}>(`select s.id,s.rarity,s.is_native,s.facing_direction,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id in ('pongdang-shark','pongdang-whale','pongi-explorer','pongi-statue') group by s.id`)
 expect(rows).toHaveLength(4)
 expect(rows.every(s=>s.is_native&&s.habitats.join(',')==='pongdang')).toBe(true)
 expect(rows.find(s=>s.id==='pongdang-shark')).toMatchObject({rarity:'epic',facing_direction:'right'})
 expect(rows.find(s=>s.id==='pongdang-whale')).toMatchObject({rarity:'epic',facing_direction:'right'})
 expect(rows.find(s=>s.id==='pongi-explorer')).toMatchObject({rarity:'mythic',facing_direction:'right'})
 expect((await db.query("select size from public.collectible_species where id='sea-crocodile'")).rows[0]).toEqual({size:144})
})

it('replaces the two epic sheets and expands habitats without changing owned species IDs',async()=>{
 const uid='00000000-0000-0000-0000-000000000998'
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'pongdang-shark',.4,.6)",[uid])
 const sql=readFileSync('supabase/sql/42-shared-shark-whale/01-shared-shark-whale.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 const {rows}=await db.query<{id:string;name:string;is_native:boolean;rarity:string;sprite_sheet_path:string;habitats:number}>(`select s.id,s.name,s.is_native,s.rarity,s.sprite_sheet_path,count(h.region_id)::int habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id in ('pongdang-shark','pongdang-whale') group by s.id`)
 const count=(await db.query<{count:number}>('select count(*)::int count from public.regions')).rows[0].count
 expect(rows).toHaveLength(2)
 expect(rows.every(s=>!s.is_native&&s.rarity==='epic'&&s.habitats===count)).toBe(true)
 expect(rows.find(s=>s.id==='pongdang-shark')).toMatchObject({name:'햇물결 상어',sprite_sheet_path:'fish/epic/sunwave-shark_sprite.png'})
 expect(rows.find(s=>s.id==='pongdang-whale')).toMatchObject({name:'물결날개 고래',sprite_sheet_path:'fish/epic/wavefin-whale_sprite.png'})
 expect((await db.query("select position_x::float as x,position_y::float as y from public.player_collectibles where species_id='pongdang-shark'")).rows).toEqual([{x:.4,y:.6}])
})

it('adds distinct orange native species while keeping the shared shark and whale',async()=>{
 const sql=readFileSync('supabase/sql/43-native-pongdang-and-current-swim/01-native-pongdang-and-current-swim.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 const {rows}=await db.query<{id:string;name:string;rarity:string;is_native:boolean;habitats:string[];sprite_sheet_path:string}>(`select s.id,s.name,s.rarity,s.is_native,s.sprite_sheet_path,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id in ('pongdang-shark','pongdang-whale','pongi-explorer','pongdang-native-shark','pongdang-native-whale') group by s.id`)
 expect(rows).toHaveLength(5)
 for(const id of ['pongdang-native-shark','pongdang-native-whale'])expect(rows.find(s=>s.id===id)).toMatchObject({rarity:'epic',is_native:true,habitats:['pongdang']})
 expect(rows.find(s=>s.id==='pongdang-shark')).toMatchObject({name:'햇물결 상어',is_native:false,sprite_sheet_path:'fish/epic/sunwave-shark-glide_sprite.png'})
 expect(rows.find(s=>s.id==='pongdang-whale')).toMatchObject({name:'물결날개 고래',is_native:false,sprite_sheet_path:'fish/epic/wavefin-whale-glide_sprite.png'})
 expect(rows.find(s=>s.id==='pongi-explorer')).toMatchObject({rarity:'mythic',sprite_sheet_path:'fish/mythic/pongi-explorer-cruise_sprite.png'})
 expect((await db.query("select position_x::float as x,position_y::float as y from public.player_collectibles where species_id='pongdang-shark'")).rows).toEqual([{x:.4,y:.6}])
})

it('registers eight mistmoon endemic species idempotently with the requested rarities and motion',async()=>{
 const sql=readFileSync('supabase/sql/44-mistmoon-lunea/01-mistmoon-lunea.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 const {rows}=await db.query<{id:string;rarity:string;movement_type:string;is_native:boolean;facing_direction:string;habitats:string[]}>(`select s.id,s.rarity,s.movement_type,s.is_native,s.facing_direction,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id in ('mistbread-sponge','whisper-pipefish','dream-thread-worm','mist-whisker-catfish','moonshadow-flounder','lunea-knight','lunea-archivist','lunea-mistmoon-goddess') group by s.id`)
 expect(rows).toHaveLength(8)
 expect(rows.every(s=>s.is_native&&s.habitats.join(',')==='mistmoon'&&s.facing_direction==='right')).toBe(true)
 expect(['common','rare','epic','mythic'].map(r=>rows.filter(s=>s.rarity===r).length)).toEqual([3,2,2,1])
 expect(rows.find(s=>s.id==='mistbread-sponge')?.movement_type).toBe('fixed')
 expect(rows.find(s=>s.id==='dream-thread-worm')?.movement_type).toBe('crawl')
 expect(rows.find(s=>s.id==='lunea-mistmoon-goddess')?.rarity).toBe('mythic')
 expect((await db.query("select position_x::float as x,position_y::float as y from public.player_collectibles where species_id='pongdang-shark'")).rows).toEqual([{x:.4,y:.6}])
})

it('registers six mistmoon relics with one habitat and preserves owned decorations on repeat',async()=>{
 const sql=readFileSync('supabase/sql/45-mistmoon-relics/01-mistmoon-relics.sql','utf8')
 const manifest=JSON.parse(readFileSync('assets/storage-upload/new/20261015-173555/manifest.json','utf8')) as {species:{id:string;kind:string;rarity:string;path:string}[]}
 await db.exec(sql)
 const uid='00000000-0000-0000-0000-000000000998'
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'dream-keeping-well',.3,.8)",[uid])
 await db.exec(sql)
 const {rows}=await db.query<{id:string;kind:string;rarity:string;is_native:boolean;movement_type:string;flip_with_direction:boolean;sprite_sheet_path:string|null;thumbnail_path:string;habitats:string[]}>(`select s.id,s.kind,s.rarity,s.is_native,s.movement_type,s.flip_with_direction,s.sprite_sheet_path,s.thumbnail_path,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id`,[manifest.species.map(s=>s.id)])
 expect(rows).toHaveLength(6)
 for(const s of manifest.species){
  expect(rows.find(r=>r.id===s.id)).toMatchObject({kind:s.kind,rarity:s.rarity,is_native:true,habitats:['mistmoon'],thumbnail_path:s.path,sprite_sheet_path:null,flip_with_direction:false,movement_type:s.kind==='decoration'?'fixed':'swim'})
 }
 expect((await db.query("select position_x::float x,position_y::float y from public.player_collectibles where species_id='dream-keeping-well'")).rows).toEqual([{x:.3,y:.8}])
})

it('seeds fifteen coral natives, animated fixed species and replaces only the seadragon sheet',async()=>{
 await db.exec("alter table collectible_species add column if not exists facing_direction text not null default 'right'; alter table collectible_species drop constraint if exists collectible_nonfish_common;")
 const sql=readFileSync('supabase/sql/49-coral-collection/01-coral-collection.sql','utf8')
 await db.exec(sql)
 const rows=JSON.parse(readFileSync('assets/storage-upload/new/20261015-192806/species.json','utf8')) as {id:string;kind:string;rarity:string}[]
 const uid='00000000-0000-0000-0000-000000000997'
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'ancient-coral-giant-crab',.4,.8)",[uid])
 await db.exec(sql)
 const result=await db.query<{id:string;kind:string;rarity:string;idle_animated:boolean;movement_type:string;habitats:string[]}>("select s.id,s.kind,s.rarity,s.idle_animated,s.movement_type,array_agg(h.region_id) habitats from collectible_species s join collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id",[rows.map(r=>r.id)])
 expect(result.rows).toHaveLength(15)
 for(const row of rows)expect(result.rows.find(s=>s.id===row.id)).toMatchObject({kind:row.kind,rarity:row.rarity,habitats:['coral']})
 expect(result.rows.find(s=>s.id==='ancient-coral-giant-crab')).toMatchObject({idle_animated:true,movement_type:'fixed'})
 expect((await db.query("select idle_animated,sprite_sheet_path from collectible_species where id='coral-flower-anemone'")).rows).toEqual([{idle_animated:true,sprite_sheet_path:'decorations/rare/coral-flower-anemone_sprite.png'}])
 expect((await db.query("select position_x::float x,position_y::float y from player_collectibles where user_id=$1",[uid])).rows).toEqual([{x:.4,y:.8}])
})

it('shares four coral species across every region and changes only the giant crab movement',async()=>{
 const sql=readFileSync('supabase/sql/50-shared-coral-and-walking-crab/01-shared-coral-and-walking-crab.sql','utf8')
 await db.exec(sql)
 await db.exec("insert into public.regions(id,name,description,rarity,sort_order,image_path) values('test-shared-sea','새 바다','확장 해역','common',99,'test-shared-sea.png')")
 await db.exec(sql)
 const ids=['coralfan-butterflyfish','crimson-fin-seabream','rubyeye-moray','flowerveil-jellyfish']
 const regions=(await db.query<{id:string}>('select id from public.regions order by id')).rows.map(r=>r.id)
 const result=await db.query<{id:string;is_native:boolean;native_region_id:string|null;description:string;habitats:string[]}>("select s.id,s.is_native,s.native_region_id,s.description,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id",[ids])
 expect(result.rows).toHaveLength(4)
 for(const row of result.rows){
  expect(row.is_native).toBe(false)
  expect(row.native_region_id).toBeNull()
  expect(row.habitats).toEqual(regions)
  expect(row.description).not.toContain('여울')
 }
 const crab=(await db.query("select native_region_id,movement_type,speed::float speed,idle_animated,flip_with_direction,facing_direction,sprite_sheet_path,sell_price,rarity from public.collectible_species where id='ancient-coral-giant-crab'")).rows[0]
 expect(crab).toEqual({native_region_id:'coral',movement_type:'crawl',speed:.01,idle_animated:false,flip_with_direction:true,facing_direction:'right',sprite_sheet_path:'fish/mythic/ancient-coral-giant-crab-walk_sprite.png',sell_price:1800,rarity:'mythic'})
 expect((await db.query("select position_x::float x,position_y::float y from public.player_collectibles where user_id='00000000-0000-0000-0000-000000000997'")).rows).toEqual([{x:.4,y:.8}])
 expect((await db.query("select native_region_id,idle_animated from public.collectible_species where id='coral-flower-anemone'")).rows[0]).toEqual({native_region_id:'coral',idle_animated:true})
})

it('seeds shared ocean life with animated fixed fish and rare trash, repeatably',async()=>{
 await db.exec(readFileSync('supabase/sql/49-coral-collection/01-coral-collection.sql','utf8'))
 const seed=readFileSync('supabase/sql/51-shared-ocean-life/01-shared-ocean-life.sql','utf8')
 const entries=JSON.parse(readFileSync('assets/storage-upload/new/20261015-201817/species.json','utf8')) as {id:string;kind:string;rarity:string;movement:string;idle:boolean;path:string}[]
 await db.exec(seed)
 await db.exec(seed)
 const regions=(await db.query<{id:string}>('select id from public.regions order by id')).rows.map(r=>r.id)
 const result=await db.query<{id:string;kind:string;rarity:string;movement_type:string;idle_animated:boolean;is_native:boolean;sprite_sheet_path:string|null;habitats:string[]}>(`select s.id,s.kind,s.rarity,s.movement_type,s.idle_animated,s.is_native,s.sprite_sheet_path,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id`,[entries.map(r=>r.id)])
 expect(result.rows).toHaveLength(16)
 for(const row of result.rows){
  const entry=entries.find(r=>r.id===row.id)!
  expect(row).toMatchObject({kind:entry.kind,rarity:entry.rarity,movement_type:entry.movement,idle_animated:entry.idle,is_native:false,habitats:regions,sprite_sheet_path:entry.kind==='fish'?entry.path+'_sprite.png':null})
 }
})

it('converts animated props to decorations without losing sheets, habitats or ownership',async()=>{
 const seed=readFileSync('supabase/sql/52-animated-decoration-types/01-animated-decoration-types.sql','utf8')
 const ids=['sunken-windmill','pea-sponge','mistbread-sponge']
 const before=(await db.query('select id,sprite_sheet_path,thumbnail_path,native_region_id from public.collectible_species where id=any($1) order by id',[ids])).rows
 const uid='00000000-0000-0000-0000-000000000997'
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'sunken-windmill',.3,.7)",[uid])
 await db.exec(seed)
 await db.exec(seed)
 const after=(await db.query('select id,sprite_sheet_path,thumbnail_path,native_region_id from public.collectible_species where id=any($1) order by id',[ids])).rows
 expect(after).toEqual(before)
 const rows=(await db.query('select kind,movement_type,idle_animated,speed::float speed,swim_y_min,swim_y_max from public.collectible_species where id=any($1)',[ids])).rows
 expect(rows).toHaveLength(3)
 for(const row of rows)expect(row).toEqual({kind:'decoration',movement_type:'fixed',idle_animated:true,speed:0,swim_y_min:null,swim_y_max:null})
 expect((await db.query("select id,size from public.collectible_species where id in ('sunken-windmill','dawn-narwhal') order by id")).rows).toEqual([{id:'dawn-narwhal',size:160},{id:'sunken-windmill',size:145}])
 expect((await db.query("select position_x::float x,position_y::float y from public.player_collectibles where user_id=$1 and species_id='sunken-windmill'",[uid])).rows).toEqual([{x:.3,y:.7}])
})

it('adds four decorative animation sheets without changing existing placement or catalog identity',async()=>{
 const ids=['seashell-pinwheel','tiny-reef-carousel','pearl-bearing-clam','coral-covered-treasure-chest']
 const before=(await db.query('select id,kind,rarity,size,thumbnail_path,native_region_id from public.collectible_species where id=any($1) order by id',[ids])).rows
 const seed=readFileSync('supabase/sql/53-animated-decorations/01-animated-decorations.sql','utf8')
 await db.exec(seed)
 await db.exec(seed)
 expect((await db.query('select id,kind,rarity,size,thumbnail_path,native_region_id from public.collectible_species where id=any($1) order by id',[ids])).rows).toEqual(before)
 const rows=(await db.query('select id,sprite_sheet_path,idle_animated,movement_type from public.collectible_species where id=any($1)',[ids])).rows
 expect(rows).toHaveLength(4)
 for(const r of rows){expect(r).toMatchObject({idle_animated:true,movement_type:'fixed'});expect(r.sprite_sheet_path).toContain(r.id+'_sprite.png')}
})

it('animates five more decorations and changes two rarities without changing identity or prices',async()=>{
 const animated=['sleeping-mini-shipwreck','first-coral-cradle','dream-keeping-well','coral-house','moonlit-jellyfish-lantern'],downgraded=['butter-starfish','ripple-coral-fragment'],ids=[...animated,...downgraded]
 const before=(await db.query('select id,size,thumbnail_path,sell_price,native_region_id from public.collectible_species where id=any($1) order by id',[ids])).rows
 const sql=readFileSync('supabase/sql/54-living-decorations/01-living-decorations.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 expect((await db.query('select id,size,thumbnail_path,sell_price,native_region_id from public.collectible_species where id=any($1) order by id',[ids])).rows).toEqual(before)
 const rows=(await db.query('select id,kind,idle_animated,sprite_sheet_path from public.collectible_species where id=any($1)',[animated])).rows
 expect(rows).toHaveLength(5)
 for(const row of rows){expect(row).toMatchObject({kind:'decoration',idle_animated:true});expect(row.sprite_sheet_path).toBe('decorations/rare/'+row.id+'_sprite.png')}
 expect((await db.query('select rarity from public.collectible_species where id=any($1)',[downgraded])).rows).toEqual([{rarity:'common'},{rarity:'common'}])
})

it('animates the Lunea archive while preserving its epic native catalog data',async()=>{
 const before=(await db.query("select kind,rarity,size,native_region_id,thumbnail_path,sell_price from public.collectible_species where id='lunea-record-shelf'")).rows
 const sql=readFileSync('supabase/sql/55-lunea-archive-animation/01-lunea-archive-animation.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 expect((await db.query("select kind,rarity,size,native_region_id,thumbnail_path,sell_price from public.collectible_species where id='lunea-record-shelf'")).rows).toEqual(before)
 expect((await db.query("select sprite_sheet_path,idle_animated,movement_type from public.collectible_species where id='lunea-record-shelf'")).rows).toEqual([{sprite_sheet_path:'decorations/epic/lunea-record-shelf_sprite.png',idle_animated:true,movement_type:'fixed'}])
})

it('registers eighteen Atlantis collection species with native habitats and rich fixed guardian animation',async()=>{
 const specs=JSON.parse(readFileSync('assets/storage-upload/new/20261015-213344/species.json','utf8')) as {id:string;kind:string;rarity:string;movement:string;idle:boolean;native_region_id:string|null;path:string}[]
 const sql=readFileSync('supabase/sql/56-atlantis-collection/01-atlantis-collection.sql','utf8')
 await db.exec(sql)
 const uid='00000000-0000-0000-0000-000000000997'
 await db.query("insert into public.player_collectibles(user_id,species_id,position_x,position_y) values($1,'atlantean-sentinel',.4,.8)",[uid])
 await db.exec(sql)
 const regions=(await db.query<{id:string}>('select id from public.regions order by id')).rows.map(r=>r.id)
 const rows=(await db.query<{id:string;kind:string;rarity:string;movement_type:string;idle_animated:boolean;native_region_id:string|null;is_native:boolean;sprite_sheet_path:string|null;habitats:string[]}>('select s.id,s.kind,s.rarity,s.movement_type,s.idle_animated,s.native_region_id,s.is_native,s.sprite_sheet_path,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id',[specs.map(s=>s.id)])).rows
 expect(rows).toHaveLength(18)
 for(const r of rows){const s=specs.find(s=>s.id===r.id)!;expect(r).toMatchObject({kind:s.kind,rarity:s.rarity,movement_type:s.movement,idle_animated:s.idle,native_region_id:s.native_region_id,is_native:!!s.native_region_id,habitats:s.native_region_id?[s.native_region_id]:regions,sprite_sheet_path:s.kind==='trash'?null:s.path+'_sprite.png'})}
 expect(rows.filter(r=>r.native_region_id==='starruins')).toHaveLength(16)
 expect(rows.find(r=>r.id==='coral-covered-shipwreck')).toMatchObject({kind:'decoration',rarity:'epic',native_region_id:'coral'})
 expect((await db.query("select position_x::float x,position_y::float y from public.player_collectibles where species_id='atlantean-sentinel' and user_id=$1",[uid])).rows).toEqual([{x:.4,y:.8}])
})

it('changes the Atlantis sentinel to walking while preserving catalog identity and owned placement',async()=>{
 const before=(await db.query("select kind,rarity,size,native_region_id,thumbnail_path,sell_price from public.collectible_species where id='atlantean-sentinel'")).rows
 const sql=readFileSync('supabase/sql/57-walking-atlantean-sentinel/01-walking-atlantean-sentinel.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 expect((await db.query("select kind,rarity,size,native_region_id,thumbnail_path,sell_price from public.collectible_species where id='atlantean-sentinel'")).rows).toEqual(before)
 expect((await db.query("select movement_type,speed::float speed,idle_animated,flip_with_direction,sprite_sheet_path from public.collectible_species where id='atlantean-sentinel'")).rows).toEqual([{movement_type:'crawl',speed:0.012,idle_animated:false,flip_with_direction:true,sprite_sheet_path:'fish/mythic/atlantean-sentinel-walk_sprite.png'}])
 expect((await db.query("select position_x::float x,position_y::float y from public.player_collectibles where species_id='atlantean-sentinel' and user_id='00000000-0000-0000-0000-000000000997'")).rows).toEqual([{x:.4,y:.8}])
})

it('registers five varied aquatic decorations and two trash items in every region',async()=>{
 const specs=JSON.parse(readFileSync('assets/storage-upload/new/20261015-222454/species.json','utf8')) as {id:string;kind:string;rarity:string}[]
 const sql=readFileSync('supabase/sql/58-shared-aquatic-plants/01-shared-aquatic-plants.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 const regions=(await db.query<{id:string}>('select id from public.regions order by id')).rows.map(r=>r.id)
 const rows=(await db.query<{id:string;kind:string;rarity:string;is_native:boolean;movement_type:string;habitats:string[]}>('select s.id,s.kind,s.rarity,s.is_native,s.movement_type,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id',[specs.map(s=>s.id)])).rows
 expect(rows).toHaveLength(7)
 expect(rows.filter(r=>r.kind==='decoration')).toHaveLength(5)
 for(const r of rows){const s=specs.find(s=>s.id===r.id)!;expect(r).toMatchObject({kind:s.kind,rarity:s.rarity,is_native:false,habitats:regions,movement_type:s.kind==='decoration'?'fixed':'swim'})}
})

it('animates based aquatic plants without changing rarity habitats or ownership',async()=>{
 const ids=['ribbon-eelgrass','pebble-sea-moss','spiral-kelp','pearl-sea-grapes','rose-fan-seaweed']
 const before=(await db.query('select id,rarity,size,sell_price,native_region_id from public.collectible_species where id=any($1) order by id',[ids])).rows
 const sql=readFileSync('supabase/sql/59-animated-aquatic-plants/01-animated-aquatic-plants.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 expect((await db.query('select id,rarity,size,sell_price,native_region_id from public.collectible_species where id=any($1) order by id',[ids])).rows).toEqual(before)
 const rows=(await db.query<{id:string;kind:string;idle_animated:boolean;movement_type:string;sprite_sheet_path:string;thumbnail_path:string}>('select id,kind,idle_animated,movement_type,sprite_sheet_path,thumbnail_path from public.collectible_species where id=any($1)',[ids])).rows
 expect(rows).toHaveLength(5)
 for(const r of rows){expect(r).toMatchObject({kind:'decoration',idle_animated:true,movement_type:'fixed'});expect(r.sprite_sheet_path).toContain(r.id+'-based_sprite.png');expect(r.thumbnail_path).toContain(r.id+'-based_thumbnail.png')}
})

it('adds five distinct common-region trash objects with the chosen rarities',async()=>{
 const specs=JSON.parse(readFileSync('assets/storage-upload/new/20261015-232647/species.json','utf8')) as {id:string;rarity:string;path:string;price:number}[]
 const sql=readFileSync('supabase/sql/60-shared-lost-objects/01-shared-lost-objects.sql','utf8')
 await db.exec(sql);await db.exec(sql)
 const regions=(await db.query<{id:string}>('select id from public.regions order by id')).rows.map(r=>r.id)
 const rows=(await db.query<{id:string;kind:string;rarity:string;is_native:boolean;habitats:string[];thumbnail_path:string;sprite_sheet_path:string|null;sell_price:number}>('select s.id,s.kind,s.rarity,s.is_native,s.thumbnail_path,s.sprite_sheet_path,s.sell_price,array_agg(h.region_id order by h.region_id) habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id',[specs.map(s=>s.id)])).rows
 expect(rows).toHaveLength(5)
 for(const r of rows){const s=specs.find(s=>s.id===r.id)!;expect(r).toMatchObject({kind:'trash',rarity:s.rarity,is_native:false,habitats:regions,thumbnail_path:s.path,sprite_sheet_path:null,sell_price:s.price})}
})
