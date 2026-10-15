// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const db = new PGlite()
const ids = Array.from({ length: 8 }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`)
const codes: string[] = []
async function asUser(uid: string, sql: string, params: unknown[] = []) {
  await db.exec('set role authenticated')
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid])
    return await db.query(sql, params)
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}
async function send(from = 0, to = 1): Promise<string> {
  const result = await asUser(ids[from], 'select public.send_friend_request($1) as id', [codes[to]])
  return (result.rows[0] as { id: string }).id
}
async function respond(user: number, id: string, action: string) {
  return asUser(ids[user], 'select public.respond_friend_request($1,$2)', [id, action])
}
beforeAll(async () => {
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
  for (const file of [
    '01-profiles/01-tables.sql', '02-friends/01-tables.sql', '03-notifications/01-tables.sql',
    '04-functions/01-social-api.sql', '05-realtime/01-publication.sql', '06-avatars/01-avatar-storage.sql', '07-friend-removal/01-remove-friend.sql', '08-gold/01-wallet.sql', '09-aquarium/01-backgrounds.sql', '10-aquarium-tanks/01-tanks.sql', '11-regions/01-regions.sql', '12-region-travel/01-travel.sql', '13-fishing/01-fishing.sql', '14-bait-catalog/01-baits.sql', '15-collectibles/01-collectibles.sql', '16-cartoon-collectibles/01-cartoon-collectibles.sql', '17-collectible-paths/01-paths.sql', '22-aquarium-management/01-management.sql', '23-collectible-gifts/01-gifts.sql',
  ]) {
    const legacyId='99999999-9999-9999-9999-999999999999'
    if(file.startsWith('15-')) {
      await db.query('insert into auth.users(id) values($1)',[legacyId])
      await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,123,'{\"bait\":7}')",[legacyId])
      await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity) values($1,gen_random_uuid(),'pongdang','bait','common')",[legacyId])
      await db.query("insert into public.player_catch_counts values($1,'common',3)",[legacyId])
      await asUser(legacyId,'select public.aquarium_state()')
    }
    await db.exec(await readFile(resolve('supabase/sql', file), 'utf8'))
    if(file.startsWith('15-')) {
      expect((await db.query('select * from public.fishing_attempts')).rows).toHaveLength(0)
      expect((await db.query("select to_regclass('public.player_catch_counts') as old_table")).rows[0]).toEqual({old_table:null})
      expect((await db.query('select gold,inventory from public.player_wallets where user_id=$1',[legacyId])).rows[0]).toMatchObject({gold:123,inventory:{bait:7}})
      expect((await db.query('select * from public.aquarium_tanks where user_id=$1',[legacyId])).rows).toHaveLength(1)
      await db.query('delete from auth.users where id=$1',[legacyId])
    }
  }
  await db.exec(await readFile(resolve('supabase/sql/25-decoration-editing/01-decoration-editing.sql'),'utf8'))
  await db.exec(await readFile(resolve('supabase/sql/26-collectible-storage/01-storage.sql'),'utf8'))
  for (const [index, id] of ids.entries()) {
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [id, JSON.stringify({ game_nickname: `낚시꾼${index}` })])
    const profile = await asUser(id, 'select * from public.sync_player_profile()')
    codes.push((profile.rows[0] as { friend_code: string }).friend_code)
  }
}, 60000)
beforeEach(async () => { await db.exec('truncate public.collectible_gifts cascade; truncate public.fishing_attempts; truncate public.player_collectibles cascade; truncate public.player_discoveries; update app_private.region_settings set test_lock_controls=true; truncate public.player_navigation; truncate public.player_map_fragments; truncate public.aquarium_tanks cascade; truncate public.player_aquariums; truncate public.owned_aquarium_backgrounds; truncate public.gold_transactions; truncate public.player_wallets; update app_private.gold_settings set test_charge_enabled=true; truncate public.friend_requests cascade; truncate public.notifications; truncate storage.objects; update public.player_profiles set avatar_path=null') })
afterAll(async () => { await db.close() })

describe('collectible gift escrow, receipt and reactions',()=>{
 async function setup(){
  const request=await send();await respond(1,request,'accept')
  await asUser(ids[0],'select public.aquarium_state()')
  const tank=(await db.query<{id:string}>('select id from public.aquarium_tanks where user_id=$1',[ids[0]])).rows[0].id
  const item=(await db.query<{id:string}>("insert into public.player_collectibles(user_id,species_id,tank_id) values($1,'pongul',$2) returning id",[ids[0],tank])).rows[0].id
  return {request,item,tank}
 }
 async function gift(item:string){return (await asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4) as gift',[ids[1],[item],'함께 헤엄치자!','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])).rows[0] as {gift:{id:string;status:string;message:string}}
 }
 it('reserves one existing individual, claims once and replies once without notification duplication',async()=>{
  const {item}=await setup(),sent=await gift(item)
  expect(sent.gift).toMatchObject({status:'pending',message:'함께 헤엄치자!'})
  expect((await gift(item)).gift.id).toBe(sent.gift.id)
  expect((await asUser(ids[0],'select * from public.player_collectibles')).rows).toHaveLength(0)
  expect((await asUser(ids[1],'select * from public.player_collectibles')).rows).toHaveLength(0)
  await expect(asUser(ids[1],'select public.sell_collectibles($1,$2)',[[item],'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  await expect(asUser(ids[1],'select public.react_to_collectible_gift($1,$2)',[sent.gift.id,'heart'])).rejects.toThrow('GIFT_NOT_CLAIMED')
  await asUser(ids[1],'select public.claim_collectible_gift($1)',[sent.gift.id])
  await asUser(ids[1],'select public.claim_collectible_gift($1)',[sent.gift.id])
  const received=(await asUser(ids[1],'select * from public.player_collectibles')).rows
  expect(received).toHaveLength(1);expect(received[0]).toMatchObject({id:item,user_id:ids[1],escrow_gift_id:null})
  expect((await db.query('select * from public.player_discoveries where user_id=$1',[ids[1]])).rows).toHaveLength(1)
  await asUser(ids[1],'select public.react_to_collectible_gift($1,$2)',[sent.gift.id,'thumbs_up'])
  await asUser(ids[1],'select public.react_to_collectible_gift($1,$2)',[sent.gift.id,'thumbs_up'])
  await expect(asUser(ids[1],'select public.react_to_collectible_gift($1,$2)',[sent.gift.id,'heart'])).rejects.toThrow('GIFT_ALREADY_REACTED')
  expect((await db.query("select kind,title from public.notifications where category='gift' order by kind")).rows).toEqual([{kind:'gift_claimed',title:'선물을 받았어요'},{kind:'gift_reaction',title:'따봉을 보냈어요'},{kind:'gift_received',title:'선물을 받았습니다'}])
 })
 it('restricts participants and friendship, validates requests and preserves privacy',async()=>{
  const {item}=await setup()
  await expect(asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4)',[ids[2],[item],'','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])).rejects.toThrow('GIFT_FRIEND_REQUIRED')
  await expect(asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4)',[ids[0],[item],'','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])).rejects.toThrow('INVALID_RECIPIENT')
  await expect(asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4)',[ids[1],[item,item],'','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])).rejects.toThrow('INVALID_GIFT')
  await expect(asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4)',[ids[1],[item],'a'.repeat(301),'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])).rejects.toThrow('INVALID_GIFT')
  const sent=await gift(item)
  await expect(asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4)',[ids[1],[item],'다른 메모','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])).rejects.toThrow('OPERATION_CONFLICT')
  await expect(asUser(ids[2],'select public.gift_detail($1)',[sent.gift.id])).rejects.toThrow('GIFT_NOT_FOUND')
  await expect(asUser(ids[0],'select public.claim_collectible_gift($1)',[sent.gift.id])).rejects.toThrow('GIFT_NOT_FOUND')
  expect((await asUser(ids[2],'select * from public.collectible_gifts')).rows).toHaveLength(0)
  await expect(asUser(ids[1],"update public.collectible_gifts set status='claimed'")).rejects.toThrow('permission denied')
 })
 it('keeps gifts receivable after friendship ends or the sender account is deleted',async()=>{
  const {item,request}=await setup(),sent=await gift(item)
  await asUser(ids[0],'select public.remove_friend($1)',[request])
  await db.query('delete from auth.users where id=$1',[ids[0]])
  await asUser(ids[1],'select public.claim_collectible_gift($1)',[sent.gift.id])
  expect((await asUser(ids[1],'select * from public.player_collectibles')).rows).toHaveLength(1)
  // Restore fixture account for subsequent tests.
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[ids[0],JSON.stringify({game_nickname:'낚시꾼0'})])
  const result=await asUser(ids[0],'select * from public.sync_player_profile()');codes[0]=(result.rows[0] as {friend_code:string}).friend_code
 })
})

describe('aquarium placement and collectible sales',()=>{
 async function owned(user=0,species='pongul'){
  await asUser(ids[user],'select public.aquarium_state()')
  const tank=(await db.query<{id:string}>('select id from public.aquarium_tanks where user_id=$1',[ids[user]])).rows[0].id
  const id=(await db.query<{id:string}>('insert into public.player_collectibles(user_id,species_id,tank_id) values($1,$2,$3) returning id',[ids[user],species,tank])).rows[0].id
  return {id,tank}
 }
 it('saves decoration position, rotation and both scale limits while enforcing ownership and escrow',async()=>{
  const own=await owned(0,'coral-house'),foreign=await owned(1,'coral-house'),fish=await owned()
  for(const scale of [.5,2]){
   const result=await asUser(ids[0],'select public.arrange_decoration($1,$2,.3,.8,360,$3) as result',[own.id,own.tank,scale])
   expect(result.rows[0]).toMatchObject({result:{position_x:.3,position_y:.8,rotation:0,scale}})
  }
  const sql='select public.arrange_decoration($1,$2,.3,.8,$3,$4)'
  for(const [rotation,scale] of [[-1,1],[361,1],[0,.49],[0,2.01],[null,1],[0,null],['NaN',1],[0,'NaN']]){
   await expect(asUser(ids[0],sql,[own.id,own.tank,rotation,scale])).rejects.toThrow('INVALID_TRANSFORM')
  }
  await expect(asUser(ids[1],sql,[own.id,foreign.tank,30,1])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  await expect(asUser(ids[0],sql,[own.id,foreign.tank,30,1])).rejects.toThrow('TANK_NOT_FOUND')
  await expect(asUser(ids[0],sql,[fish.id,fish.tank,30,1])).rejects.toThrow('INVALID_ITEM')
  await expect(asUser(ids[0],'update public.player_collectibles set scale=2 where id=$1',[own.id])).rejects.toThrow('permission denied')
  expect((await db.query("select has_function_privilege('anon','public.arrange_decoration(uuid,uuid,numeric,numeric,numeric,numeric)','execute') as allowed")).rows[0]).toEqual({allowed:false})
  const request=await send();await respond(1,request,'accept')
  await asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4)',[ids[1],[own.id],'','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])
  await expect(asUser(ids[1],sql,[own.id,foreign.tank,30,1])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  await db.query('update public.player_collectibles set sold_at=now() where id=$1',[foreign.id])
  await expect(asUser(ids[1],sql,[foreign.id,foreign.tank,30,1])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
 })
 it('upgrades legacy enum, paths and gift snapshots twice without losing ownership or placement',async()=>{
  const own=await owned(0,'coral-house')
  await db.query('update public.player_collectibles set position_x=.2,position_y=.4,rotation=45,scale=1.5 where id=$1',[own.id])
  const request=await send();await respond(1,request,'accept')
  const other=await owned(0,'coral-house')
  await asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4)',[ids[1],[other.id],'','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'])
  // Reconstruct the old installed catalog and PL/pgSQL body, not just fresh install SQL.
  await db.exec("alter type public.collectible_kind rename value 'decoration' to 'structure'; update public.collectible_species set thumbnail_path=replace(thumbnail_path,'decorations/','structures/') where kind='structure'; update public.collectible_gifts set species=species||jsonb_build_object('kind','structure','thumbnail_path','structures/normal/coral-house_thumbnail.png');")
  const oldFunction=await db.query<{definition:string}>("select pg_get_functiondef('app_private.place_collectible(uuid,uuid,numeric,numeric)'::regprocedure) as definition")
  await db.exec(oldFunction.rows[0].definition.replaceAll("'decoration'","'structure'"))
  const migration=await readFile(resolve('supabase/sql/25-decoration-editing/01-decoration-editing.sql'),'utf8')
  await db.exec(migration);await db.exec(migration)
  expect((await db.query('select user_id,position_x::float as x,position_y::float as y,rotation::float as rotation,scale::float as scale from public.player_collectibles where id=$1',[own.id])).rows[0]).toEqual({user_id:ids[0],x:.2,y:.4,rotation:45,scale:1.5})
  expect((await db.query('select species from public.collectible_gifts')).rows[0]).toMatchObject({species:{kind:'decoration',thumbnail_path:'decorations/normal/coral-house_thumbnail.png'}})
  await asUser(ids[0],'select public.place_collectible($1,$2,.1,.2)',[own.id,own.tank])
  expect((await db.query("select kind::text as kind from public.collectible_species where id='coral-house'")).rows[0]).toEqual({kind:'decoration'})
 })
 it('sells an exact batch once, updates gold and preserves discoveries',async()=>{
  const a=await owned(),b=await owned()
  await db.query("insert into public.player_discoveries(user_id,species_id) values($1,'pongul')",[ids[0]])
  const operation='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const first=await asUser(ids[0],'select public.sell_collectibles($1,$2) as result',[[b.id,a.id],operation])
  expect(first.rows[0]).toMatchObject({result:{delta:80,gold:80}})
  const replay=await asUser(ids[0],'select public.sell_collectibles($1,$2) as result',[[a.id,b.id],operation])
  expect(replay.rows[0]).toMatchObject({result:{delta:0,gold:80}})
  expect((await db.query('select * from public.player_collectibles where sold_at is null')).rows).toHaveLength(0)
  expect((await db.query('select * from public.player_discoveries')).rows).toHaveLength(1)
  expect((await db.query('select * from public.gold_transactions')).rows).toHaveLength(1)
  await expect(asUser(ids[0],'select public.sell_collectibles($1,$2)',[[a.id],'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  await expect(asUser(ids[0],'select public.sell_collectibles($1,$2)',[[a.id],operation])).rejects.toThrow('OPERATION_CONFLICT')
 })
 it('rejects foreign ownership, duplicate IDs and invalid batches without partial sale',async()=>{
  const own=await owned(),foreign=await owned(1)
  const operation='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  await expect(asUser(ids[0],'select public.sell_collectibles($1,$2)',[[own.id,foreign.id],operation])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  await expect(asUser(ids[0],'select public.sell_collectibles($1,$2)',[[own.id,own.id],operation])).rejects.toThrow('INVALID_TRADE')
  expect((await db.query('select * from public.player_collectibles where sold_at is null')).rows).toHaveLength(2)
  expect((await db.query('select * from public.gold_transactions')).rows).toHaveLength(0)
  await db.query('insert into public.player_wallets(user_id,gold) values($1,1000000000) on conflict(user_id) do update set gold=excluded.gold',[ids[0]])
  await expect(asUser(ids[0],'select public.sell_collectibles($1,$2)',[[own.id],operation])).rejects.toThrow('GOLD_LIMIT')
  expect((await db.query('select sold_at from public.player_collectibles where id=$1',[own.id])).rows[0]).toEqual({sold_at:null})
 })
 it('persists owned placement only, validates coordinates and keeps RPCs private to signed-in users',async()=>{
  const own=await owned(),foreign=await owned(1)
  const placed=await asUser(ids[0],'select public.place_collectible($1,$2,$3,$4) as result',[own.id,own.tank,.3,.85])
  expect(placed.rows[0]).toMatchObject({result:{id:own.id,position_x:.3,position_y:.85}})
  await expect(asUser(ids[1],'select public.place_collectible($1,$2,$3,$4)',[own.id,foreign.tank,.2,.2])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  await expect(asUser(ids[0],'select public.place_collectible($1,$2,$3,$4)',[own.id,foreign.tank,.2,.2])).rejects.toThrow('TANK_NOT_FOUND')
  await expect(asUser(ids[0],'select public.place_collectible($1,$2,$3,$4)',[own.id,own.tank,2,.2])).rejects.toThrow('INVALID_POSITION')
  const permissions=await db.query("select has_function_privilege('anon','public.sell_collectibles(uuid[],uuid)','execute') as sale,has_function_privilege('anon','public.place_collectible(uuid,uuid,numeric,numeric)','execute') as placement")
  expect(permissions.rows[0]).toEqual({sale:false,placement:false})
  await expect(asUser(ids[0],'update public.player_collectibles set position_x=.1 where id=$1',[own.id])).rejects.toThrow('permission denied')
 })
})

describe('collectible storage and batch tank assignment',()=>{
 async function stored(species='pongul',user=0){
  return (await db.query<{id:string}>('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[ids[user],species])).rows[0].id
 }
 async function tank(user=0){
  await asUser(ids[user],'select public.aquarium_state()')
  return (await db.query<{id:string}>('select id from public.aquarium_tanks where user_id=$1 and is_default',[ids[user]])).rows[0].id
 }
 it('assigns mixed kinds atomically, preserves transforms, returns them to storage and accepts safe retries',async()=>{
  const destination=await tank(),other=await tank(1)
  const fish=await stored(),trash=await stored('glass-bottle'),decoration=await stored('coral-house'),foreign=await stored('pongul',1)
  await db.query('update public.player_collectibles set rotation=45,scale=1.5 where id=$1',[decoration])
  await expect(asUser(ids[0],'select public.move_collectibles($1,$2)',[[fish,foreign],destination])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  expect((await db.query('select tank_id from public.player_collectibles where id=$1',[fish])).rows[0]).toEqual({tank_id:null})
  await expect(asUser(ids[0],'select public.move_collectibles($1,$2)',[[fish],other])).rejects.toThrow('TANK_NOT_FOUND')
  await expect(asUser(ids[0],'select public.move_collectibles($1,$2)',[[fish,fish],destination])).rejects.toThrow('INVALID_SELECTION')
  const result=await asUser(ids[0],'select public.move_collectibles($1,$2) as state',[[fish,trash,decoration],destination])
  expect(result.rows[0]).toMatchObject({state:{storageCount:0,tankCapacity:50}})
  await asUser(ids[0],'select public.move_collectibles($1,$2)',[[fish,trash,decoration],destination])
  expect((await db.query('select scale::float as scale,rotation::float as rotation from public.player_collectibles where id=$1',[decoration])).rows[0]).toEqual({scale:1.5,rotation:45})
  await asUser(ids[0],'select public.move_collectibles($1,null)',[[fish,trash,decoration]])
  const storage=await asUser(ids[0],'select public.collectible_storage() as data')
  expect(storage.rows[0]).toMatchObject({data:{total:3}})
  expect((await db.query("select has_function_privilege('anon','public.move_collectibles(uuid[],uuid)','execute') as allowed")).rows[0]).toEqual({allowed:false})
 })
 it('enforces the 50-individual tank limit without partially moving an oversized batch',async()=>{
  const destination=await tank()
  await db.query("insert into public.player_collectibles(user_id,species_id,tank_id) select $1,'pongul',$2 from generate_series(1,49)",[ids[0],destination])
  const a=await stored(),b=await stored()
  await expect(asUser(ids[0],'select public.move_collectibles($1,$2)',[[a,b],destination])).rejects.toThrow('TANK_FULL')
  expect((await db.query('select tank_id from public.player_collectibles where id=any($1)',[[a,b]])).rows).toEqual([{tank_id:null},{tank_id:null}])
  await asUser(ids[0],'select public.move_collectibles($1,$2)',[[a],destination])
  await asUser(ids[0],'select public.move_collectibles($1,$2)',[[a],destination])
  await expect(asUser(ids[0],'select public.move_collectibles($1,$2)',[[b],destination])).rejects.toThrow('TANK_FULL')
  await asUser(ids[0],'select public.move_collectibles($1,null)',[[a]])
  await asUser(ids[0],'select public.move_collectibles($1,$2)',[[b],destination])
  const map=await stored('ocean-map')
  await expect(asUser(ids[0],'select public.move_collectibles($1,$2)',[[map],destination])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
  await db.query('update public.player_collectibles set sold_at=now() where id=$1',[a])
  await expect(asUser(ids[0],'select public.move_collectibles($1,$2)',[[a],destination])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
 })
 it('pages stored individuals, excludes maps and foreign accounts, and supports category search',async()=>{
  await db.query("insert into public.player_collectibles(user_id,species_id) select $1,'pongul' from generate_series(1,51)",[ids[0]])
  await stored('coral-house');await stored('ocean-map');await stored('pongul',1)
  const first=(await asUser(ids[0],'select public.collectible_storage(0,\'\',\'fish\') as data')).rows[0] as {data:{items:{id:string}[];total:number}}
  const second=(await asUser(ids[0],'select public.collectible_storage(50,\'\',\'fish\') as data')).rows[0] as typeof first
  expect(first.data.items).toHaveLength(50);expect(second.data.items).toHaveLength(1);expect(first.data.total).toBe(51)
  expect(first.data.items.some(item=>item.id===second.data.items[0].id)).toBe(false)
  expect((await asUser(ids[0],"select public.collectible_storage(0,'산호','decoration') as data")).rows[0]).toMatchObject({data:{total:1}})
  expect((await asUser(ids[0],"select public.collectible_storage(0,'%','all') as data")).rows[0]).toMatchObject({data:{total:0}})
  expect((await asUser(ids[0],'select public.aquarium_state() as state')).rows[0]).toMatchObject({state:{storageCount:52,inhabitants:[]}})
 })
 it('receives fish, trash and decorations into storage only after claiming gifts and without duplicating retries',async()=>{
  const request=await send();await respond(1,request,'accept')
  const destination=await tank(1)
  for(const [index,species] of ['pongul','glass-bottle','coral-house'].entries()){
   const individual=await stored(species)
   const sent=(await asUser(ids[0],'select public.send_collectible_gift($1,$2,$3,$4) as gift',[ids[1],[individual],'',`aaaaaaaa-aaaa-aaaa-aaaa-${String(index+1).padStart(12,'0')}`])).rows[0] as {gift:{id:string}}
   await expect(asUser(ids[1],'select public.move_collectibles($1,$2)',[[individual],destination])).rejects.toThrow('COLLECTIBLE_NOT_FOUND')
   await asUser(ids[1],'select public.claim_collectible_gift($1)',[sent.gift.id])
   await asUser(ids[1],'select public.claim_collectible_gift($1)',[sent.gift.id])
  }
  expect((await asUser(ids[1],'select public.aquarium_state() as state')).rows[0]).toMatchObject({state:{storageCount:3,inhabitants:[]}})
  expect((await asUser(ids[1],'select public.collectible_storage() as data')).rows[0]).toMatchObject({data:{total:3}})
  const migration=await readFile(resolve('supabase/sql/26-collectible-storage/01-storage.sql'),'utf8')
  await db.exec(migration)
  expect((await asUser(ids[1],'select public.collectible_storage() as data')).rows[0]).toMatchObject({data:{total:3}})
 })
})

describe('friend and notification database permissions', () => {
  it('generates unique friend codes and limits profile browsing to related users', async () => {
    expect(new Set(codes).size).toBe(8)
    expect(codes.every(code => /^[A-F0-9]{12}$/.test(code))).toBe(true)
    expect((await asUser(ids[0], 'select * from public.player_profiles')).rows).toHaveLength(1)
    expect((await asUser(ids[0], 'select * from public.find_player_by_code($1)', [codes[1]])).rows).toHaveLength(1)
    const result = await db.query("select has_function_privilege('anon','public.send_friend_request(text)','execute') as allowed")
    expect(result.rows[0]).toEqual({ allowed: false })
  })
  it('creates a request and a private recipient notification in one transaction', async () => {
    await send()
    const recipient = await asUser(ids[1], 'select * from public.notifications')
    expect(recipient.rows).toHaveLength(1)
    expect(recipient.rows[0]).toMatchObject({ category: 'friend', kind: 'friend_request', recipient_id: ids[1] })
    expect((await asUser(ids[0], 'select * from public.notifications')).rows).toHaveLength(0)
    expect((await asUser(ids[2], 'select * from public.friend_requests')).rows).toHaveLength(0)
  })
  it('blocks self requests and duplicate requests in either direction', async () => {
    await expect(send(0, 0)).rejects.toThrow('CANNOT_FRIEND_SELF')
    await send()
    await expect(send()).rejects.toThrow('RELATIONSHIP_EXISTS')
    await expect(send(1, 0)).rejects.toThrow('RELATIONSHIP_EXISTS')
    expect((await db.query('select * from public.notifications')).rows).toHaveLength(1)
  })
  it('only allows the recipient to accept, creates the acceptance notification and prevents replay', async () => {
    const id = await send()
    await expect(respond(0, id, 'accept')).rejects.toThrow('NOT_ALLOWED')
    await expect(respond(2, id, 'accept')).rejects.toThrow('NOT_ALLOWED')
    await expect(respond(1, id, 'cancel')).rejects.toThrow('NOT_ALLOWED')
    await respond(1, id, 'accept')
    const rows = (await asUser(ids[0], 'select * from public.notifications')).rows
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'friend_accepted', recipient_id: ids[0] })
    expect((await asUser(ids[1], 'select * from public.friend_requests')).rows[0]).toMatchObject({ status: 'accepted' })
    await expect(respond(1, id, 'accept')).rejects.toThrow('REQUEST_ALREADY_HANDLED')
    await expect(send()).rejects.toThrow('RELATIONSHIP_EXISTS')
  })
  it('declines without notifying the sender and gives a later request a new ID', async () => {
    const first = await send()
    await respond(1, first, 'decline')
    expect((await asUser(ids[0], 'select * from public.notifications')).rows).toHaveLength(0)
    expect((await asUser(ids[1], 'select * from public.notifications')).rows[0]).toMatchObject({ request_id: first })
    await expect(send()).rejects.toThrow('FRIEND_RATE_LIMIT')
    await db.query("update public.friend_requests set updated_at=now()-interval '2 minutes' where id=$1", [first])
    expect(await send()).not.toBe(first)
  })
  it('allows only the sender to cancel and closes the original notification', async () => {
    const id = await send()
    await respond(0, id, 'cancel')
    expect((await db.query('select status from public.friend_requests')).rows[0]).toEqual({ status: 'cancelled' })
    expect((await db.query('select read_at from public.notifications')).rows[0]).not.toEqual({ read_at: null })
  })
  it('does not permit forging requests or notification contents', async () => {
    await expect(asUser(ids[0], 'insert into public.friend_requests(sender_id,recipient_id) values($1,$2)', [ids[0], ids[1]])).rejects.toThrow('permission denied')
    await expect(asUser(ids[0], "insert into public.notifications(recipient_id,category,kind,title) values($1,'general','reward','fake')", [ids[0]])).rejects.toThrow('permission denied')
    await send()
    await expect(asUser(ids[1], "update public.notifications set title='fake'")).rejects.toThrow('permission denied')
    expect((await asUser(ids[0], 'update public.notifications set read_at=now() returning id')).rows).toHaveLength(0)
    expect((await asUser(ids[1], 'update public.notifications set read_at=now() returning id')).rows).toHaveLength(1)
  })
  it('supports private general notifications inserted by a trusted operator', async () => {
    await db.query("insert into public.notifications(recipient_id,category,kind,title) values($1,'general','announcement','공지')", [ids[0]])
    expect((await asUser(ids[0], 'select category from public.notifications')).rows).toEqual([{ category: 'general' }])
    expect((await asUser(ids[1], 'select * from public.notifications')).rows).toHaveLength(0)
  })
  it('enforces the per-sender request rate limit', async () => {
    for (let target = 1; target <= 5; target++) await send(0, target)
    await expect(send(0, 6)).rejects.toThrow('FRIEND_RATE_LIMIT')
  })
  it('publishes both realtime tables', async () => {
    const result = await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime' order by tablename")
    expect(result.rows).toEqual([{ tablename: 'friend_requests' }, { tablename: 'notifications' }, { tablename: 'player_profiles' }])
  })
})

describe('avatar storage ownership', () => {
  const filename = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp'
  it('only permits upload/list/delete within the caller folder', async () => {
    const path = `${ids[0]}/${filename}`
    await asUser(ids[0], 'insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)', ['avatars',path,JSON.stringify({mimetype:'image/webp'})])
    await expect(asUser(ids[1], 'insert into storage.objects(bucket_id,name) values($1,$2)', ['avatars',path])).rejects.toThrow('row-level security')
    expect((await asUser(ids[1],'select * from storage.objects')).rows).toHaveLength(0)
    expect((await asUser(ids[1],'delete from storage.objects returning id')).rows).toHaveLength(0)
    expect((await asUser(ids[0],'delete from storage.objects returning id')).rows).toHaveLength(1)
  })
  it('requires an existing own WebP object, preserves the avatar during nickname sync, and allows reset', async () => {
    const path = `${ids[0]}/${filename}`
    await expect(asUser(ids[1],'select public.set_player_avatar($1)',[path])).rejects.toThrow('INVALID_AVATAR_PATH')
    await expect(asUser(ids[0],'select public.set_player_avatar($1)',[path])).rejects.toThrow('AVATAR_NOT_FOUND')
    await asUser(ids[0], 'insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)', ['avatars',path,JSON.stringify({mimetype:'image/webp'})])
    const saved = await asUser(ids[0],'select * from public.set_player_avatar($1)',[path])
    expect(saved.rows[0]).toMatchObject({avatar_path:path})
    const synced = await asUser(ids[0],'select * from public.sync_player_profile()')
    expect(synced.rows[0]).toMatchObject({avatar_path:path})
    const reset = await asUser(ids[0],'select * from public.set_player_avatar(null)')
    expect(reset.rows[0]).toMatchObject({avatar_path:null})
  })
  it('configures a public WebP bucket with a 5MB server limit', async () => {
    const result=await db.query("select public,file_size_limit,allowed_mime_types from storage.buckets where id='avatars'")
    expect(result.rows[0]).toMatchObject({public:true,allowed_mime_types:['image/webp']})
    expect(Number((result.rows[0] as {file_size_limit:number}).file_size_limit)).toBe(5242880)
  })
})
describe('friend removal', () => {
  it.each([0, 1])('allows participant %i to remove a friendship without notifying', async (user) => {
    const id = await send()
    await respond(1, id, 'accept')
    await asUser(ids[user], 'select public.remove_friend($1)', [id])
    for (const participant of [0, 1]) {
      expect((await asUser(ids[participant], "select id from public.friend_requests where status='accepted'")).rows).toHaveLength(0)
    }
    expect((await db.query('select status from public.friend_requests')).rows[0]).toEqual({ status: 'removed' })
    const notifications = (await db.query('select read_at from public.notifications')).rows
    expect(notifications).toHaveLength(2)
    expect(notifications.every(row => (row as {read_at: unknown}).read_at !== null)).toBe(true)
    await expect(asUser(ids[user], 'select public.remove_friend($1)', [id])).rejects.toThrow('FRIENDSHIP_NOT_ACTIVE')
    await db.query("update public.friend_requests set updated_at=now()-interval '2 minutes' where id=$1", [id])
    expect(await send()).not.toBe(id)
  })
  it('rejects outsiders, unauthenticated calls and pending relationships', async () => {
    const id = await send()
    await expect(asUser(ids[0], 'select public.remove_friend($1)', [id])).rejects.toThrow('FRIENDSHIP_NOT_ACTIVE')
    await respond(1, id, 'accept')
    await expect(asUser(ids[2], 'select public.remove_friend($1)', [id])).rejects.toThrow('NOT_ALLOWED')
    await expect(db.query('select public.remove_friend($1)', [id])).rejects.toThrow('AUTH_REQUIRED')
    expect((await db.query("select has_function_privilege('anon','public.remove_friend(uuid)','execute') as allowed")).rows[0]).toEqual({allowed:false})
    expect((await db.query('select status from public.friend_requests')).rows[0]).toEqual({status:'accepted'})
  })
})
describe('server gold transactions', () => {
 const op = (n: number) => `aaaaaaaa-aaaa-aaaa-aaaa-${String(n).padStart(12,'0')}`
 async function transact(user: number, n: number, action: string, item: string | null = null) {
  return (await asUser(ids[user], 'select public.trade_gold($1,$2,$3) as result', [op(n),action,item])).rows[0] as {result:{gold:number;inventory:Record<string,number>;delta:number}}
 }
 it('atomically charges, buys and sells, preventing duplicate operations and repeated free gold', async () => {
  expect((await transact(0,1,'charge')).result.gold).toBe(1000)
  expect((await transact(0,1,'charge')).result.delta).toBe(0)
  await expect(transact(0,2,'charge')).rejects.toThrow('TEST_CHARGE_ALREADY_CLAIMED')
  expect((await transact(0,3,'buy','bait')).result).toMatchObject({gold:970,inventory:{bait:1},delta:-30})
  expect((await transact(0,3,'buy','bait')).result).toMatchObject({gold:970,delta:0})
  await expect(transact(0,3,'sell','bait')).rejects.toThrow('OPERATION_CONFLICT')
  expect((await transact(0,4,'sell','bait')).result).toMatchObject({gold:988,inventory:{bait:0},delta:18})
  expect((await db.query('select * from public.gold_transactions')).rows).toHaveLength(3)
 })
 it('rejects invalid trades, insufficient funds and inventory without changing balance', async () => {
  await expect(transact(0,1,'buy','bait')).rejects.toThrow('INSUFFICIENT_GOLD')
  await expect(transact(0,2,'sell','shell')).rejects.toThrow('INSUFFICIENT_INVENTORY')
  await expect(transact(0,3,'buy','fake')).rejects.toThrow('INVALID_ITEM')
  expect((await db.query('select * from public.gold_transactions')).rows).toHaveLength(0)
 })
 it('enforces owner-only reads, no browser writes, authentication and admin charge switch', async () => {
  await transact(0,1,'charge')
  expect((await asUser(ids[1],'select * from public.player_wallets')).rows).toHaveLength(0)
  expect((await asUser(ids[1],'select * from public.gold_transactions')).rows).toHaveLength(0)
  await expect(asUser(ids[0],'update public.player_wallets set gold=99999')).rejects.toThrow('permission denied')
  await expect(asUser(ids[0], 'delete from public.gold_transactions')).rejects.toThrow('permission denied')
  await expect(db.query('select public.get_gold_wallet()')).rejects.toThrow('AUTH_REQUIRED')
  await db.exec('update app_private.gold_settings set test_charge_enabled=false')
  await expect(transact(1,2,'charge')).rejects.toThrow('TEST_CHARGE_DISABLED')
 })
})
describe('aquarium backgrounds',()=>{
 const operation='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
 async function action(id:string,type:string){
  if(type==='equip') {
   const state=(await asUser(ids[0],'select public.aquarium_state() as result')).rows[0] as {result:{tanks:{id:string}[]}}
   return (await asUser(ids[0],"select public.manage_aquarium_tank($1,'equip',$2) as result",[state.result.tanks[0].id,id])).rows[0] as {result:{gold:number;delta:number;background:string}}
  }
  return (await asUser(ids[0],'select public.aquarium_background($1,$2,$3) as result',[id,type,operation])).rows[0] as {result:{gold:number;delta:number;background:string}}}
 it('starts with free default, atomically buys once, equips owned backgrounds and retains them',async()=>{
  expect((await asUser(ids[0],'select public.aquarium_state() as result')).rows[0]).toMatchObject({result:{background:'default',owned:[]}})
  await asUser(ids[0],"select public.trade_gold($1,'charge')",['cccccccc-cccc-cccc-cccc-cccccccccccc'])
  expect((await action('coral','buy')).result).toMatchObject({gold:900,delta:-100})
  expect((await action('coral','buy')).result.delta).toBe(0)
  expect((await action('coral','equip')).result.background).toBe('coral')
  expect((await action('default','equip')).result.background).toBe('default')
  expect((await asUser(ids[1],'select * from public.owned_aquarium_backgrounds')).rows).toHaveLength(0)
  expect((await db.query('select * from public.gold_transactions')).rows).toHaveLength(2)
 })
 it('rejects insufficient gold, unowned equip, forged writes and operation reuse',async()=>{
  await expect(action('moon','buy')).rejects.toThrow('INSUFFICIENT_GOLD')
  await expect(action('moon','equip')).rejects.toThrow('BACKGROUND_NOT_OWNED')
  await expect(asUser(ids[0],"update public.aquarium_backgrounds set price=0")).rejects.toThrow('permission denied')
  await expect(asUser(ids[0],"insert into public.owned_aquarium_backgrounds values($1,'pearl',now())",[ids[0]])).rejects.toThrow('permission denied')
  expect((await db.query('select * from public.owned_aquarium_backgrounds')).rows).toHaveLength(0)
 })
})
describe('multiple aquarium tanks',()=>{
 async function state(user=0){return (await asUser(ids[user],'select public.aquarium_state() as state')).rows[0] as {state:{tanks:{id:string;name:string;background_id:string}[]}}}
 async function buy(op:string){return asUser(ids[0],'select public.buy_aquarium_tank($1)',[op])}
 it('creates exactly one free tank, buys additional tanks for 200 each and prevents replay',async()=>{
  expect((await state()).state.tanks).toHaveLength(1)
  expect((await state()).state.tanks).toHaveLength(1)
  await asUser(ids[0],"select public.trade_gold($1,'charge')",['dddddddd-dddd-dddd-dddd-dddddddddddd'])
  await buy('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
  await buy('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
  expect((await state()).state.tanks).toHaveLength(2)
  await buy('ffffffff-ffff-ffff-ffff-ffffffffffff')
  expect((await state()).state.tanks).toHaveLength(3)
  expect((await asUser(ids[0],'select gold from public.player_wallets')).rows[0]).toEqual({gold:600})
  expect((await asUser(ids[1],'select * from public.aquarium_tanks')).rows).toHaveLength(0)
 })
 it('renames only own tanks and applies backgrounds separately per tank',async()=>{
  const first=(await state()).state.tanks[0].id
  await asUser(ids[0],"select public.trade_gold($1,'charge')",['dddddddd-dddd-dddd-dddd-dddddddddddd'])
  await buy('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
  const second=(await state()).state.tanks.find(t=>t.id!==first)!.id
  await asUser(ids[0],"select public.manage_aquarium_tank($1,'rename','  산호의 집  ')",[second])
  await asUser(ids[0],"select public.aquarium_background('coral','buy',$1)",['ffffffff-ffff-ffff-ffff-ffffffffffff'])
  await asUser(ids[0],"select public.manage_aquarium_tank($1,'equip','coral')",[second])
  const tanks=(await state()).state.tanks
  expect(tanks.find(t=>t.id===first)?.background_id).toBe('default')
  expect(tanks.find(t=>t.id===second)).toMatchObject({name:'산호의 집',background_id:'coral'})
  await expect(asUser(ids[1],"select public.manage_aquarium_tank($1,'rename','침입')",[second])).rejects.toThrow('TANK_NOT_FOUND')
  await expect(asUser(ids[0],"select public.manage_aquarium_tank($1,'rename','   ')",[second])).rejects.toThrow('INVALID_TANK_NAME')
  await expect(asUser(ids[0],"update public.aquarium_tanks set name='위조'")).rejects.toThrow('permission denied')
 })
 it('does not create a paid tank with insufficient funds',async()=>{
  await state()
  await expect(buy('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')).rejects.toThrow('INSUFFICIENT_GOLD')
  expect((await state()).state.tanks).toHaveLength(1)
 })
})
describe('region map and shared rarity',()=>{
 it('starts offshore with five regions, correct rarities and all other regions locked',async()=>{
  const result=(await asUser(ids[0],'select public.region_map() as map')).rows[0] as {map:{currentRegion:string;regions:{rarity:string;unlocked:boolean}[]}}
  expect(result.map.currentRegion).toBe('pongdang')
  expect(result.map.regions.map(r=>r.rarity)).toEqual(['common','common','common','rare','epic'])
  expect(result.map.regions.map(r=>r.unlocked)).toEqual([true,false,false,false,false])
  await expect(asUser(ids[0],"select public.travel_region('coral')")).rejects.toThrow('REGION_LOCKED')
  await expect(asUser(ids[0],"select public.travel_region('fake')")).rejects.toThrow('REGION_NOT_FOUND')
 })
 it('honors server-issued fragment ownership, saves travel and prevents forging or reading others',async()=>{
  await db.query("insert into public.player_map_fragments(user_id,region_id) values($1,'coral')",[ids[0]])
  const result=(await asUser(ids[0],"select public.travel_region('coral') as map")).rows[0] as {map:{currentRegion:string}}
  expect(result.map.currentRegion).toBe('coral')
  expect((await asUser(ids[0],'select region_id from public.player_navigation')).rows[0]).toEqual({region_id:'coral'})
  expect((await asUser(ids[1],'select * from public.player_map_fragments')).rows).toHaveLength(0)
  await expect(asUser(ids[1],"select public.travel_region('coral')")).rejects.toThrow('REGION_LOCKED')
  await expect(asUser(ids[1],"insert into public.player_map_fragments(user_id,region_id) values($1,'coral')",[ids[1]])).rejects.toThrow('permission denied')
  await expect(asUser(ids[1],"update public.player_navigation set region_id='dreamabyss'")).rejects.toThrow('permission denied')
  await expect(db.query('select public.region_map()')).rejects.toThrow('AUTH_REQUIRED')
  expect((await db.query("select has_function_privilege('anon','public.travel_region(text)','EXECUTE') as allowed")).rows[0]).toEqual({allowed:false})
 })
})
describe('test region lock controls',()=>{
 it('unlocks and locks only the caller, returns current player home on locking and preserves the starting route',async()=>{
  await asUser(ids[0],"select public.set_region_test_lock('coral',false)")
  await asUser(ids[0],"select public.travel_region('coral')")
  await expect(asUser(ids[1],"select public.travel_region('coral')")).rejects.toThrow('REGION_LOCKED')
  await asUser(ids[0],"select public.set_region_test_lock('coral',true)")
  expect((await asUser(ids[0],'select region_id from public.player_navigation')).rows[0]).toEqual({region_id:'pongdang'})
  await expect(asUser(ids[0],"select public.travel_region('coral')")).rejects.toThrow('REGION_LOCKED')
  await expect(asUser(ids[0],"select public.set_region_test_lock('pongdang',true)")).rejects.toThrow('DEFAULT_REGION_ALWAYS_OPEN')
 })
 it('honors the server kill switch and rejects anonymous execution',async()=>{
  await db.exec('update app_private.region_settings set test_lock_controls=false')
  await expect(asUser(ids[0],"select public.set_region_test_lock('coral',false)")).rejects.toThrow('TEST_CONTROLS_DISABLED')
  const map=(await asUser(ids[0],'select public.region_map() as map')).rows[0] as {map:{canTestLocks:boolean}}
  expect(map.map.canTestLocks).toBe(false)
  await expect(db.query("select public.set_region_test_lock('coral',false)")).rejects.toThrow('AUTH_REQUIRED')
  expect((await db.query("select has_function_privilege('anon','public.set_region_test_lock(text,boolean)','EXECUTE') as allowed")).rows[0]).toEqual({allowed:false})
 })
})
describe('bait inventory and fishing',()=>{
 let operation=0
 const op=()=>`abababab-abab-abab-abab-${String(++operation).padStart(12,'0')}`
 async function charge(){await asUser(ids[0],"select public.trade_gold($1,'charge')",[op()]);await asUser(ids[0],'select public.region_map()')}
 async function buy(bait:string,id=op()){return (await asUser(ids[0],'select public.buy_fishing_bait($1,$2) as result',[bait,id])).rows[0] as {result:{gold:number;inventory:Record<string,number>}}}
 async function cast(bait:string,id=op(),region='pongdang'){return (await asUser(ids[0],'select public.cast_fishing($1,$2,$3) as result',[region,bait,id])).rows[0] as {result:{attempt:{rarity:string|null;operation_id:string;collectible_id:string|null};replayed:boolean}}}
 it('resolves all 10000 equally sized random buckets to the exact requested odds',async()=>{
  for(const [bait,expected] of [
   ['bait',{common:3000,rare:1000,epic:100,mythic:30,failure:5870}],
   ['bait_special',{rare:9870,epic:100,mythic:30}],
   ['bait_safe',{common:4174,rare:1000,epic:100,mythic:30,failure:4696}],
  ] as const){
   const rows=(await db.query("select coalesce(app_private.resolve_fishing($1,n)::text,'failure') as rarity,count(*)::int as count from generate_series(0,9999) n group by 1",[bait])).rows as {rarity:string;count:number}[]
   expect(Object.fromEntries(rows.map(r=>[r.rarity,r.count]))).toEqual(expected)
  }
  await expect(asUser(ids[0],"select app_private.resolve_fishing('bait',0)")).rejects.toThrow('permission denied')
 })
 it('charges server prices, keeps old normal inventory and does not duplicate a purchase',async()=>{
  await charge()
  const id=op()
  expect((await buy('bait',id)).result).toMatchObject({gold:970,inventory:{bait:1}})
  expect((await buy('bait',id)).result).toMatchObject({gold:970,inventory:{bait:1}})
  await expect(buy('bait_special')).rejects.toThrow('BAIT_NOT_FOR_SALE')
  await expect(buy('bait_safe')).rejects.toThrow('BAIT_NOT_FOR_SALE')
  await expect(buy('unknown')).rejects.toThrow('INVALID_BAIT')
  expect((await asUser(ids[1],'select * from public.gold_transactions')).rows).toHaveLength(0)
 })
 it('consumes a special bait once, guarantees rare+, stores the result and replays without rerolling',async()=>{
  await charge();await db.query("update public.player_wallets set inventory=jsonb_build_object('bait_special',1) where user_id=$1",[ids[0]])
  const id=op();const result=(await cast('bait_special',id)).result
  expect(['rare','epic','mythic']).toContain(result.attempt.rarity)
  const replay=(await cast('bait_special',id)).result
  expect(replay.attempt).toEqual(result.attempt)
  expect(replay.replayed).toBe(true)
  expect((await asUser(ids[0],'select inventory from public.player_wallets')).rows[0]).toMatchObject({inventory:{bait_special:0}})
  expect((await db.query('select * from public.fishing_attempts')).rows).toHaveLength(1)
  expect((await db.query('select count(*)::integer as quantity from public.player_collectibles')).rows[0]).toEqual({quantity:1})
  await expect(cast('bait',id)).rejects.toThrow('OPERATION_CONFLICT')
  await expect(cast('bait_special')).rejects.toThrow('NO_BAIT')
 })
 it('consumes a normal bait and only increments inventory on a successful roll',async()=>{
  await charge();await buy('bait')
  const {attempt}=(await cast('bait')).result
  expect((await db.query('select * from public.fishing_attempts')).rows).toHaveLength(1)
  expect((await asUser(ids[0],'select inventory from public.player_wallets')).rows[0]).toMatchObject({inventory:{bait:0}})
  expect((await db.query('select * from public.player_collectibles')).rows).toHaveLength(attempt.collectible_id?1:0)
 })
 it('rejects absent bait, wrong location, locked regions, forged casts and access to others',async()=>{
  await charge();await buy('bait')
  await expect(cast('bait',op(),'coral')).rejects.toThrow('NOT_IN_REGION')
  await db.query("update public.player_navigation set region_id='coral' where user_id=$1",[ids[0]])
  await expect(cast('bait',op(),'coral')).rejects.toThrow('REGION_LOCKED')
  expect((await asUser(ids[0],'select inventory from public.player_wallets')).rows[0]).toMatchObject({inventory:{bait:1}})
  await expect(asUser(ids[0],"insert into public.player_discoveries(user_id,species_id) values($1,'dream-pongul')",[ids[0]])).rejects.toThrow('permission denied')
  await expect(asUser(ids[0],"update public.fishing_baits set price=1")).rejects.toThrow('permission denied')
  expect((await asUser(ids[1],'select * from public.fishing_attempts')).rows).toHaveLength(0)
  await expect(db.query('select public.fishing_state()')).rejects.toThrow('AUTH_REQUIRED')
 })
})
describe('named acquisition-only baits',()=>{
 it('sells only the worm, keeps other prices null and records lore/effects',async()=>{
  const rows=(await asUser(ids[0],'select id,name,price,effect_kind,description,effect_description from public.fishing_baits order by sort_order')).rows as {id:string;name:string;price:number|null;effect_kind:string;description:string;effect_description:string}[]
  expect(rows).toHaveLength(5)
  expect(rows.filter(b=>b.price!==null).map(b=>b.name)).toEqual(['퐁당 지렁이'])
  expect(rows.every(b=>b.description.length>40&&b.effect_description.length>10)).toBe(true)
  expect(rows.find(b=>b.id==='bait_epic')).toMatchObject({name:'별잠의 유혹',price:null})
  expect(rows.find(b=>b.id==='bait_magnet')?.effect_kind).toBe('decoration')
 })
 it('gives epic+ for all 10000 buckets',async()=>{
  const rows=(await db.query("select app_private.resolve_fishing('bait_epic',n)::text as rarity,count(*)::int as count from generate_series(0,9999) n group by 1")).rows as {rarity:string;count:number}[]
  expect(Object.fromEntries(rows.map(r=>[r.rarity,r.count]))).toEqual({epic:9970,mythic:30})
 })
})
describe('real collectible instances and aquarium integration',()=>{
 const operation='cfcfcfcf-cfcf-cfcf-cfcf-cfcfcfcfcfcf'
 async function prepare(bait:string){
  await asUser(ids[0],'select public.region_map()')
  await asUser(ids[0],'select public.get_gold_wallet()')
  await db.query('update public.player_wallets set inventory=jsonb_build_object($2::text,2) where user_id=$1',[ids[0],bait])
 }
 it('keeps caught fish in storage and preserves one instance on replay',async()=>{
  await prepare('bait_epic')
  for(const region of ['coral','mistmoon','starruins','dreamabyss']) await asUser(ids[0],'select public.set_region_test_lock($1,false)',[region])
  const result=(await asUser(ids[0],"select public.cast_fishing('pongdang','bait_epic',$1) as result",[operation])).rows[0] as {result:{attempt:{collectible_id:string;species:{kind:string;name:string;rarity:string}}}}
  expect(result.result.attempt.species.kind).toBe('fish')
  expect(['epic','mythic']).toContain(result.result.attempt.species.rarity)
  const owned=(await asUser(ids[0],'select * from public.player_collectibles')).rows[0] as {tank_id:string}
  await asUser(ids[0],'select public.aquarium_state()')
  const tank=(await asUser(ids[0],'select * from public.aquarium_tanks where is_default')).rows[0] as {id:string}
  expect(owned.tank_id).toBeNull()
  await asUser(ids[0],"select public.cast_fishing('pongdang','bait_epic',$1)",[operation])
  expect((await db.query('select * from public.player_collectibles')).rows).toHaveLength(1)
  const state=(await asUser(ids[0],'select public.aquarium_state() as state')).rows[0] as {state:{inhabitants:unknown[];storageCount:number}}
  expect(state.state.inhabitants).toHaveLength(0)
  expect(state.state.storageCount).toBe(1)
  expect((await asUser(ids[1],'select * from public.player_collectibles')).rows).toHaveLength(0)
  await expect(asUser(ids[1],'update public.player_collectibles set tank_id=$1',[tank.id])).rejects.toThrow('permission denied')
 })
 it('magnet always catches a decoration, unlocks its thumbnail in the guide and consumes one bait',async()=>{
  await prepare('bait_magnet')
  const result=(await asUser(ids[0],"select public.cast_fishing('pongdang','bait_magnet',$1) as result",[operation])).rows[0] as {result:{attempt:{species:{id:string;kind:string}}}}
  expect(result.result.attempt.species).toMatchObject({id:'coral-house',kind:'decoration'})
  expect((await asUser(ids[0],'select inventory from public.player_wallets')).rows[0]).toMatchObject({inventory:{bait_magnet:1}})
  const state=(await asUser(ids[0],'select public.collection_state() as state')).rows[0] as {state:{catalog:{id:string;discovered:boolean;habitats:unknown[]}[]}}
  expect(state.state.catalog.find(s=>s.id==='coral-house')).toMatchObject({discovered:true})
  expect(state.state.catalog[0].habitats).toHaveLength(5)
 })
 it('supports common-grade trash with only a thumbnail and storage on acquisition',async()=>{
  await db.exec('begin')
  try{
   await prepare('bait')
   await db.exec("create or replace function app_private.resolve_fishing(p_bait_id text,p_roll integer) returns public.game_rarity language sql as $$select 'common'::public.game_rarity$$")
   await db.exec("delete from public.collectible_habitats where species_id='ocean-map' or (region_id='pongdang' and species_id='pongul')")
   const result=(await asUser(ids[0],"select public.cast_fishing('pongdang','bait',$1) as result",[operation])).rows[0] as {result:{attempt:{rarity:string;collectible_id:string;species:{kind:string;sprite_sheet_path:null}}}}
   expect(result.result.attempt.species).toMatchObject({kind:'trash',rarity:'common',sprite_sheet_path:null})
   expect(result.result.attempt.rarity).toBe('common')
   expect(result.result.attempt.collectible_id).toBeTruthy()
   expect((await db.query('select * from public.player_collectibles')).rows).toHaveLength(1)
  }finally{await db.exec('rollback')}
 })
})
describe('cartoon collectible catalog',()=>{
 it('has exactly seven archetypes with four fish sheets and only common non-fish',async()=>{
  const rows=(await db.query('select kind,rarity,sprite_sheet_path,thumbnail_path from public.collectible_species order by kind,rarity')).rows as {kind:string;rarity:string;sprite_sheet_path:string|null;thumbnail_path:string}[]
  expect(rows).toHaveLength(7)
  expect(rows.filter(s=>s.kind==='fish').map(s=>s.rarity)).toEqual(['common','rare','epic','mythic'])
  expect(rows.filter(s=>s.kind!=='fish').map(s=>s.kind).sort()).toEqual(['decoration','map','trash'])
  expect(rows.filter(s=>s.kind!=='fish').every(s=>s.rarity==='common'&&s.sprite_sheet_path===null)).toBe(true)
  expect(rows.filter(s=>s.kind==='fish').every(s=>s.sprite_sheet_path?.endsWith('_sprite.png'))).toBe(true)
  expect(rows.every(s=>s.thumbnail_path.endsWith('_thumbnail.png')&&!s.thumbnail_path.startsWith('v2/'))).toBe(true)
  expect((await db.query("select r.id from public.collectible_habitats h join public.regions r on r.id=h.region_id where h.species_id='ocean-map' order by r.id")).rows).toEqual([{id:'coral'},{id:'mistmoon'}])
 })
 it('keeps guaranteed rare casts on rare-or-higher fish with the common-only map catalog',async()=>{
  await asUser(ids[0],'select public.region_map()')
  await asUser(ids[0],'select public.get_gold_wallet()')
  await db.query("update public.player_wallets set inventory='{\"bait_special\":1}' where user_id=$1",[ids[0]])
  const result=(await asUser(ids[0],"select public.cast_fishing('pongdang','bait_special',gen_random_uuid()) as result")).rows[0] as {result:{attempt:{species:{kind:string;rarity:string}}}}
  expect(result.result.attempt.species.kind).toBe('fish')
  expect(['rare','epic','mythic']).toContain(result.result.attempt.species.rarity)
 })
})

describe('undiscovered region map drops',()=>{
 it('awards only a still-locked matching-grade map, stores its destination rarity and opens that route',async()=>{
  await db.exec('begin')
  try{
   await asUser(ids[0],'select public.region_map()')
   await asUser(ids[0],'select public.get_gold_wallet()')
   await db.query("update public.player_wallets set inventory='{\"bait\":3}' where user_id=$1",[ids[0]])
   await db.exec("create or replace function app_private.resolve_fishing(p_bait_id text,p_roll integer) returns public.game_rarity language sql as $$select 'common'::public.game_rarity$$")
   await db.exec("delete from public.collectible_habitats where species_id in ('pongul','glass-bottle')")
   const op='a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1'
   const first=(await asUser(ids[0],"select public.cast_fishing('pongdang','bait',$1) as result",[op])).rows[0] as {result:{attempt:{collectible_id:string;species:{kind:string;rarity:string;map_region_id:string}}}}
   expect(first.result.attempt.species.kind).toBe('map')
   expect(first.result.attempt.species.rarity).toBe('common')
   expect(['coral','mistmoon']).toContain(first.result.attempt.species.map_region_id)
   const instance=(await asUser(ids[0],'select * from public.player_collectibles where id=$1',[first.result.attempt.collectible_id])).rows[0] as {tank_id:null}
   expect(instance.tank_id).toBeNull()
   const regions=(await asUser(ids[0],'select region_id from public.player_map_fragments')).rows as {region_id:string}[]
   expect(regions.map(r=>r.region_id)).toContain(first.result.attempt.species.map_region_id)
   const second=(await asUser(ids[0],"select public.cast_fishing('pongdang','bait',$1) as result",['a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2'])).rows[0] as typeof first
   expect(second.result.attempt.species.map_region_id).not.toBe(first.result.attempt.species.map_region_id)
  }finally{await db.exec('rollback')}
 })
})
