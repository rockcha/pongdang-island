// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
import catalog from '../supabase/catalog/catalog.json'
let db:any
const migration='20261026082940_rebalance_fuel_production_storage.sql',user='00000000-0000-4000-8000-000000007341'
beforeAll(async()=>{db=await createLocalDatabase();for(const f of migrationFiles().filter(f=>f<migration))await db.exec(readSql('supabase/migrations/'+f));await db.query('insert into auth.users(id) values($1)',[user]);await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"fuel\":3}')",[user]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])},180000)
afterAll(async()=>{await db?.close()})
async function act(action:string,facility:string,materials:Record<string,number>={}){return (await db.query('select public.production_action($1,$2,$3,$4) r',[action,crypto.randomUUID(),facility,JSON.stringify(materials)])).rows[0].r}
it('applies storage and efficiency changes only to new cycles while preserving owned sites and existing production snapshots',async()=>{
 const old=(await db.query('select * from public.production_facilities order by id')).rows
 await db.query("insert into public.player_collectibles(user_id,species_id) select $1,'shared-refining-smelt' from generate_series(1,12)",[user])
 await db.query("insert into public.player_collectibles(user_id,species_id) select $1,'shared-drift-scrap-wood' from generate_series(1,7)",[user])
 await act('buy','dewdrop-glass-distiller');await act('start','dewdrop-glass-distiller',{'shared-refining-smelt':3})
 await act('buy','baby-puffer-pressure-vat');await act('start','baby-puffer-pressure-vat',{'shared-drift-scrap-wood':3})
 await act('buy','deep-pearl-pressure-refiner');await act('start','deep-pearl-pressure-refiner',{'shared-refining-smelt':6})
 const before=(await db.query('select * from app_private.production_sites where user_id=$1 order by id',[user])).rows
 const wallet=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[user])).rows
 await db.exec(readSql('supabase/migrations/'+migration))
 expect((await db.query('select * from app_private.production_sites where user_id=$1 order by id',[user])).rows).toEqual(before)
 expect((await db.query('select gold,inventory from public.player_wallets where user_id=$1',[user])).rows).toEqual(wallet)
 for(const f of old){const next=catalog.production_facilities.find(n=>n.id===f.id)!
  expect(next.price).toBe(f.price);expect(next.production_minutes).toBe(f.production_minutes)
  if(f.kind==='fish'&&f.storage_minutes<=60){expect(next.storage_minutes).toBeGreaterThan(f.storage_minutes);expect(next.output_count).toBe(f.output_count)}
  else if(f.kind==='fish'){expect(next.storage_minutes).toBe(f.storage_minutes);expect(next.output_count).toBeGreaterThan(f.output_count);expect(next.input_count).toBe(f.input_count)}
  else if(f.storage_minutes===30){expect(next.storage_minutes).toBe(90);expect(next.input_count).toBeGreaterThan(f.input_count);expect(next.output_count).toBe(f.output_count)}
  else expect(next).toMatchObject({storage_minutes:f.storage_minutes,input_count:f.input_count,output_count:f.output_count})
 }
 // Old output is paid from its snapshot even after the catalog was buffed.
 await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour' where user_id=$1 and facility_id in('dewdrop-glass-distiller','baby-puffer-pressure-vat')",[user])
 expect((await act('claim','dewdrop-glass-distiller')).fuel).toBe(7)
 await act('start','dewdrop-glass-distiller',{'shared-refining-smelt':3})
 expect((await db.query("select run_output from app_private.production_sites where user_id=$1 and facility_id='dewdrop-glass-distiller'",[user])).rows[0].run_output).toBe(5)
 await act('claim','baby-puffer-pressure-vat')
 await expect(act('start','baby-puffer-pressure-vat',{'shared-drift-scrap-wood':3})).rejects.toThrow('INVALID_MATERIAL_COUNT')
 await act('start','baby-puffer-pressure-vat',{'shared-drift-scrap-wood':4})
 const site=(await db.query("select * from app_private.production_sites where user_id=$1 and facility_id='baby-puffer-pressure-vat'",[user])).rows[0]
 expect(new Date(site.expires_at).getTime()-new Date(site.completes_at).getTime()).toBe(90*60000)
 expect(site.run_output).toBe(2)
})
