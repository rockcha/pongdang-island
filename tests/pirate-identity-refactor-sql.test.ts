// @vitest-environment node
import {it,expect} from 'vitest'
import fs from 'node:fs'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
import catalog from '../supabase/catalog/catalog.json'
const migration='20261027000840_plunder_pirate_identity_refinement.sql'
const manifest=JSON.parse(fs.readFileSync('assets/storage-upload/new/20261027-090400/manifest.json','utf8'))
it('preserves owned specimens, discoveries and value when replacing pirate identities, including repeated deployment',async()=>{
 const db=await createLocalDatabase(),uid=crypto.randomUUID()
 try{
  for(const file of migrationFiles()){if(file===migration)break;await db.exec(readSql('supabase/migrations/'+file))}
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'pirateQA')",[uid])
  for(const i of manifest.items)await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2)',[uid,i.id])
  const ownership=async()=>(await db.query('select id,user_id,species_id,tank_id from public.player_collectibles where user_id=$1 order by id',[uid])).rows
  const before=await ownership()
  const discoveries=(await db.query('select * from public.player_discoveries where user_id=$1 order by species_id',[uid])).rows
  for(let repeat=0;repeat<2;repeat++){
   await db.exec(readSql('supabase/migrations/'+migration))
   expect(await ownership()).toEqual(before)
   expect((await db.query('select * from public.player_discoveries where user_id=$1 order by species_id',[uid])).rows).toEqual(discoveries)
   for(const item of manifest.items){
    const row=(await db.query('select * from public.collectible_species where id=$1',[item.id])).rows[0]
    const expected=catalog.collectible_species.find(s=>s.id===item.id)!
    expect(row).toMatchObject({id:item.id,name:expected.name,sell_price:item.previous.sell_price,thumbnail_path:expected.thumbnail_path,sprite_sheet_path:expected.sprite_sheet_path,movement_type:expected.movement_type})
   }
  }
  expect((await db.query("select name,movement_type::text movement from public.collectible_species where id='plunder-bloodsail'")).rows[0]).toEqual({name:'탐욕의 황금손',movement:'swim'})
  expect((await db.query("select name,movement_type::text movement from public.collectible_species where id='plunder-barca'")).rows[0]).toEqual({name:'저주받은 황금함대',movement:'swim'})
  expect((await db.query("select count(*)::int n from public.collectible_species where native_region_id='plunder'")).rows[0].n).toBe(47)
 }finally{await db.close()}
},180000)
