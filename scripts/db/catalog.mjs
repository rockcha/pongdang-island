import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

export function catalogSql(catalog) {
  if (catalog.formatVersion !== 1) throw new Error('Unsupported catalog format')
  const literal = value => value === null ? 'null' : typeof value === 'boolean' || typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`
  const identifier = value => {
    if (!/^[a-z_]+$/.test(value)) throw new Error(`Invalid column: ${value}`)
    return `"${value}"`
  }
  const statements = ['-- Generated from supabase/catalog/catalog.json. Review before migration deployment.', 'begin;', 'set constraints all deferred;']
  for (const table of ['regions', 'aquarium_backgrounds', 'fishing_baits', 'collectible_species']) {
    const rows = catalog[table]
    if (!Array.isArray(rows) || !rows.length) throw new Error(`Empty catalog: ${table}`)
    const columns = Object.keys(rows[0])
    if (columns.includes('is_native')) throw new Error('is_native is generated, omit it')
    for (const row of rows) if (Object.keys(row).join() !== columns.join()) throw new Error(`Inconsistent columns: ${table}`)
    statements.push(`insert into public.${table} (${columns.map(identifier).join(',')}) values\n${rows.map(row => `(${columns.map(c => literal(row[c])).join(',')})`).join(',\n')}\non conflict(id) do update set ${columns.filter(c => c !== 'id').map(c => `${identifier(c)}=excluded.${identifier(c)}`).join(',')};`)
  }
  // The manifest controls habitats only for its species; it never deletes species or player data.
  statements.push(`delete from public.collectible_habitats where species_id in (${catalog.collectible_species.map(r => literal(r.id)).join(',')});`)
  if (catalog.collectible_habitats.length) statements.push(`insert into public.collectible_habitats(species_id,region_id) values\n${catalog.collectible_habitats.map(r => `(${literal(r.species_id)},${literal(r.region_id)})`).join(',\n')};`)
  statements.push("notify pgrst, 'reload schema';", 'commit;', '')
  return statements.join('\n')
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/db/catalog.mjs')) {
  const sql = catalogSql(JSON.parse(readFileSync('supabase/catalog/catalog.json', 'utf8')))
  const output = process.argv[2]
  if (output) {
    if (dirname(resolve(output)) !== resolve('supabase/migrations') || !/^\d{14}_.+\.sql$/.test(output.replaceAll('\\', '/').split('/').at(-1))) throw new Error('Output must be a CLI-created file in supabase/migrations')
    if (!existsSync(output) || readFileSync(output, 'utf8').trim()) throw new Error('Create an empty migration with supabase migration new first; existing SQL is never overwritten')
    writeFileSync(output, sql)
  }
  else process.stdout.write(sql)
}
