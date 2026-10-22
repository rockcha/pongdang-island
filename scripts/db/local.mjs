import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'

// Git may check out CRLF on Windows and LF in CI; SQL identity ignores only CRLF.
export const readSql = path => readFileSync(path, 'utf8').replaceAll('\r\n', '\n')

// Supabase-owned services are mocked only for local PostgreSQL validation.
// This is never a substitute for a real Supabase integration check.
export async function createLocalDatabase() {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
  `)
  return db
}

export function migrationFiles() {
  const files = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
  if (!files.length || files.some(f => !/^\d{14}_.+\.sql$/.test(f))) throw new Error('Invalid or missing migration filename; create it with Supabase CLI')
  if (new Set(files.map(f => f.slice(0, 14))).size !== files.length) throw new Error('Duplicate migration timestamp')
  return files
}

export async function replayMigrations(db, { keepScheduledMaintenance = false } = {}) {
  for (const file of migrationFiles()) {
    try { await db.exec(readSql(`supabase/migrations/${file}`)) }
    catch (error) { throw new Error(`${file}: ${error.message}`, { cause: error }) }
  }
  // Production schedules are runtime configuration. Keep ordinary local replay
  // and tests usable after the scheduled date; dedicated gate tests opt in.
  if (!keepScheduledMaintenance && (await db.query("select to_regclass('app_private.fishing_maintenance') is not null present")).rows[0].present) {
    await db.exec('update app_private.fishing_maintenance set released_at=starts_at where id')
  }
}

export async function readCatalog(db) {
  const result = { formatVersion: 1 }
  for (const table of ['regions', 'aquarium_backgrounds', 'fishing_baits', 'collectible_species', 'collectible_habitats']) {
    const order = table === 'collectible_habitats' ? 'species_id,region_id' : 'id'
    result[table] = (await db.query(`select * from public.${table} order by ${order}`)).rows.map(row => {
      // Registration time belongs to deployment history, not editable catalog content.
      if (table === 'regions') delete row.created_at
      const { is_native: _generated, ...stored } = row
      return stored
    })
  }
  if((await db.query("select to_regclass('public.region_maps') is not null as present")).rows[0].present)result.region_maps=(await db.query('select * from public.region_maps order by region_id')).rows
  if((await db.query("select to_regclass('public.fishing_rods') is not null as present")).rows[0].present)result.fishing_rods=(await db.query('select * from public.fishing_rods order by id')).rows
  if((await db.query("select to_regclass('public.harbor_vessels') is not null as present")).rows[0].present)result.harbor_vessels=(await db.query('select * from public.harbor_vessels order by id')).rows
  if(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).title_catalog)result.title_catalog=(await db.query('select * from public.title_catalog order by id')).rows
  if((await db.query("select to_regclass('public.production_facilities') is not null as present")).rows[0].present)result.production_facilities=(await db.query('select * from public.production_facilities order by id')).rows
  if((await db.query("select to_regclass('app_private.fishing_bait_balance_profiles') is not null as present")).rows[0].present)result.fishing_bait_balance_profiles=(await db.query('select * from app_private.fishing_bait_balance_profiles order by id')).rows.map(row=>({...row,native_multiplier:Number(row.native_multiplier)}))
  const retained=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).retained_species_prices
  if(retained){
    const ids=new Set(retained.map(p=>p.id))
    const prices=new Map(result.collectible_species.filter(s=>ids.has(s.id)).map(s=>[s.id,s.sell_price]))
    result.collectible_species=result.collectible_species.filter(s=>!ids.has(s.id))
    result.collectible_habitats=result.collectible_habitats.filter(h=>!ids.has(h.species_id))
    result.retained_species_prices=retained.map(p=>({...p,sell_price:prices.get(p.id)??p.sell_price}))
  }
  const details=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')).retained_species_details
  if(details){
    const ids=new Set(details.map(r=>r.id))
    const current=new Map(result.collectible_species.filter(s=>ids.has(s.id)).map(s=>[s.id,s]))
    result.collectible_species=result.collectible_species.filter(s=>!ids.has(s.id))
    result.collectible_habitats=result.collectible_habitats.filter(h=>!ids.has(h.species_id))
    result.retained_species_details=details.map(r=>({id:r.id,name:current.get(r.id)?.name??r.name,description:current.get(r.id)?.description??r.description}))
  }
  return result
}

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
  return value
}
export const canonical = value => JSON.stringify(stable(value))
