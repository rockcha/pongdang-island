// @vitest-environment node
import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
it('promotes an already-owned Mago in place and keeps ownership while changing only the requested catalog entries',async()=>{
 const db=await createLocalDatabase(),migration='20261102001612_hangang_mythic_motion_refinement.sql',uid=crypto.randomUUID()
 try{
  for(const name of migrationFiles().filter(f=>f!==migration))await db.exec(readSql('supabase/migrations/'+name))
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'창세검수')",[uid])
  const original=(await db.query("insert into public.player_collectibles(user_id,species_id,animation_seed,position_x,position_y) values($1,'hangang-mago-creator',12345,.4,.5) returning *",[uid])).rows[0]
  const other=(await db.query("select * from public.collectible_species where id='hangang-hunmin-spirit'")).rows[0]
  for(let retry=0;retry<2;retry++){
   await db.exec(readSql('supabase/migrations/'+migration))
   expect((await db.query('select * from public.player_collectibles where id=$1',[original.id])).rows[0]).toEqual(original)
   expect((await db.query("select * from public.collectible_species where id='hangang-hunmin-spirit'")).rows[0]).toEqual(other)
   expect((await db.query("select rarity,sell_price,size from public.collectible_species where id='hangang-mago-creator'")).rows[0]).toEqual({rarity:'mythic',sell_price:3800,size:170})
   expect((await db.query("select count(*)::int n from public.collectible_species where native_region_id='hangang'")).rows[0].n).toBe(84)
   expect((await db.query("select count(*)::int n from public.collectible_habitats where region_id='hangang'")).rows[0].n).toBe(84)
   const swimmers=(await db.query("select movement_type,swim_y_min,swim_y_max,speed from public.collectible_species where id in ('hangang-haetae-guardian','hangang-millennial-gumiho','hangang-iron-eater-bulgasari')")).rows
   expect(swimmers).toHaveLength(3)
   for(const s of swimmers)expect(s).toEqual({movement_type:'swim',swim_y_min:'0.2',swim_y_max:'0.78',speed:'0.02'})
  }
 }finally{await db.close()}
},180000)
