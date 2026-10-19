// @vitest-environment node
import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
it('preserves owned boats, ongoing voyages and old operation receipts when introducing physical boat IDs',async()=>{
 const db=await createLocalDatabase(),uid='00000000-0000-0000-0000-000000000951'
 try{
  const latest='20261019085512_harbor_fleet_and_fuel_rewards.sql'
  for(const file of migrationFiles()){if(file===latest)break;await db.exec(readSql('supabase/migrations/'+file))}
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,5000,'{\"fuel\":10}') on conflict(user_id) do update set gold=5000,inventory=excluded.inventory",[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.query("select public.harbor_action('buy',gen_random_uuid(),'fishing-raft')")
  await db.query("select public.harbor_action('buy',gen_random_uuid(),'neoul-boat')")
  const op=crypto.randomUUID(),old=(await db.query("select public.harbor_action('depart',$1,'fishing-raft') s",[op])).rows[0].s
  const before=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[uid])).rows[0]
  await db.exec(readSql('supabase/migrations/'+latest))
  const state=(await db.query('select public.harbor_state() s')).rows[0].s
  expect(state.boats).toHaveLength(2);expect(state.boats.map(b=>b.dock_slot).sort()).toEqual([1,2])
  expect(state.voyages[0]).toMatchObject({id:old.voyages[0].id,returns_at:old.voyages[0].returns_at,vessel_snapshot:old.voyages[0].vessel_snapshot})
  expect(state.boats.some(b=>b.id===state.voyages[0].boat_id&&b.dock_slot!==null)).toBe(true)
  await db.exec('set role authenticated')
  expect((await db.query("select public.harbor_action('depart',$1,'fishing-raft') s",[op])).rows[0].s.replayed).toBe(true)
  await db.exec('reset role')
  expect((await db.query('select gold,inventory from public.player_wallets where user_id=$1',[uid])).rows[0]).toEqual(before)
 }finally{await db.close()}
},60000)
