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
 await db.exec(readFileSync('supabase/sql/61-minigame-catch-guarantee/01-minigame-catch-guarantee.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/62-prepared-fishing/01-prepared-fishing.sql','utf8'))
 await db.exec(readFileSync('supabase/sql/62-prepared-fishing/01-prepared-fishing.sql','utf8'))
 await db.exec("insert into auth.users(id) values('00000000-0000-0000-0000-000000000801'); select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000801',false); select app_private.get_gold_wallet(); insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang') on conflict(user_id) do update set region_id='pongdang';update public.player_wallets set inventory=jsonb_build_object('bait',1000) where user_id=auth.uid();")
},60000)
afterAll(async()=>{await db.close()})

const uid='00000000-0000-0000-0000-000000000801'
async function prepare(id=crypto.randomUUID()){
 const {rows}=await db.query<{p:{operation_id:string;eligible:boolean;species:{id:string}|null;rarity:string;finished:boolean;result:unknown}}>("select public.prepare_fishing('pongdang','bait',$1) p",[id]);return rows[0].p
}
async function finish(id:string,won:boolean){return (await db.query<{r:{attempt:{collectible_id:string|null;species:{id:string}|null};replayed:boolean}}>('select public.finish_fishing($1,$2) r',[id,won])).rows[0].r}
async function age(id:string){await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '20 seconds' where operation_id=$1",[id])}
it('charges one bait and freezes a prepared result across retries and competing starts',async()=>{
 const before=(await db.query<{n:number}>("select (inventory->>'bait')::integer n from public.player_wallets where user_id=$1",[uid])).rows[0].n
 const p=await prepare();const replay=await prepare(p.operation_id);const other=await prepare()
 expect(replay).toEqual(p);expect(other).toEqual(p)
 expect((await db.query<{n:number}>("select (inventory->>'bait')::integer n from public.player_wallets where user_id=$1",[uid])).rows[0].n).toBe(before-1)
 await finish(p.operation_id,false)
})
it('never awards a prepared catch when the minigame loses and settles idempotently',async()=>{
 const before=(await db.query<{n:number}>("select (inventory->>'bait')::integer n from public.player_wallets where user_id=$1",[uid])).rows[0].n
 const p=await prepare();const one=await finish(p.operation_id,false);const two=await finish(p.operation_id,true)
 expect((await db.query<{n:number}>("select (inventory->>'bait')::integer n from public.player_wallets where user_id=$1",[uid])).rows[0].n).toBe(before-1)
 expect(one.attempt.collectible_id).toBeNull();expect(two.attempt.collectible_id).toBeNull();expect(two.replayed).toBe(true)
})
it('rolls 35 percent once, awards exactly the reserved species, and keeps failure final',async()=>{
 let successes=0
 for(let i=0;i<250;i++){
  const p=await prepare();await age(p.operation_id);const r=await finish(p.operation_id,true)
  if(p.eligible){successes++;expect(r.attempt.species?.id).toBe(p.species?.id);expect(r.attempt.collectible_id).toBeTruthy()}
  else expect(r.attempt.collectible_id).toBeNull()
  const replay=await finish(p.operation_id,true);expect(replay.attempt).toEqual(r.attempt)
 }
 expect(successes).toBeGreaterThan(55);expect(successes).toBeLessThan(120)
},30000)
it('blocks premature settlement, other owners, direct writes, and the old bypass RPC',async()=>{
 const p=await prepare()
 await expect(finish(p.operation_id,true)).rejects.toThrow('CAST_TOO_EARLY')
 await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000802',false)")
 await expect(finish(p.operation_id,false)).rejects.toThrow('CAST_NOT_FOUND')
 await db.exec("select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000801',false);set role authenticated")
 await expect(db.exec('select * from app_private.prepared_fishing_casts')).rejects.toThrow()
 await expect(db.query("select public.cast_fishing('pongdang','bait',$1)",[crypto.randomUUID()])).rejects.toThrow('FISHING_FLOW_UPDATED')
 await db.exec('reset role');await finish(p.operation_id,false)
})
it('expires abandoned casts and does not reroll or consume twice when resuming',async()=>{
 const p=await prepare();await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '4 minutes',expires_at=clock_timestamp()-interval '1 minute' where operation_id=$1",[p.operation_id])
 expect((await finish(p.operation_id,true)).attempt.collectible_id).toBeNull()
 const n=await prepare();expect(n.operation_id).not.toBe(p.operation_id);await finish(n.operation_id,false)
})
