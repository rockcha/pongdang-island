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
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
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

export async function replayMigrations(db) {
  for (const file of migrationFiles()) {
    try { await db.exec(readSql(`supabase/migrations/${file}`)) }
    catch (error) { throw new Error(`${file}: ${error.message}`, { cause: error }) }
  }
}

export async function readCatalog(db) {
  const result = { formatVersion: 1 }
  for (const table of ['regions', 'aquarium_backgrounds', 'fishing_baits', 'collectible_species', 'collectible_habitats']) {
    const order = table === 'collectible_habitats' ? 'species_id,region_id' : 'id'
    result[table] = (await db.query(`select * from public.${table} order by ${order}`)).rows.map(row => {
      const { is_native: _generated, ...stored } = row
      return stored
    })
  }
  if((await db.query("select to_regclass('public.region_maps') is not null as present")).rows[0].present)result.region_maps=(await db.query('select * from public.region_maps order by region_id')).rows
  if((await db.query("select to_regclass('public.fishing_rods') is not null as present")).rows[0].present)result.fishing_rods=(await db.query('select * from public.fishing_rods order by id')).rows
  return result
}

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]))
  return value
}
export const canonical = value => JSON.stringify(stable(value))
