import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

export function catalogSql(catalog, {tables,ids} = {}) {
  if (catalog.formatVersion !== 1) throw new Error('Unsupported catalog format')
  const literal = value => value === null ? 'null' : typeof value === 'boolean' || typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`
  const identifier = value => {
    if (!/^[a-z_]+$/.test(value)) throw new Error(`Invalid column: ${value}`)
    return `"${value}"`
  }
  const statements = ['-- Generated from supabase/catalog/catalog.json. Review before migration deployment.', 'begin;', 'set constraints all deferred;']
  const managed=['regions', 'aquarium_backgrounds', 'fishing_baits', 'collectible_species',...(catalog.region_maps?['region_maps']:[]),...(catalog.fishing_rods?['fishing_rods']:[]),...(catalog.harbor_vessels?['harbor_vessels']:[]),...(catalog.title_catalog?['title_catalog']:[]),...(catalog.retained_species_details?['retained_species_details']:[])]
  if(tables?.some(table=>!managed.includes(table)))throw new Error('Unsupported scoped catalog table')
  if(ids&&(!tables?.length||ids.some(id=>!tables.some(table=>catalog[table].some(row=>(row.id??row.region_id)===id)))))throw new Error('Unknown scoped catalog id')
  for (const table of tables??managed) {
    const rows = ids?catalog[table].filter(row=>ids.includes(row.id??row.region_id)):catalog[table]
    if(ids&&!rows.length)continue
    if (!Array.isArray(rows) || !rows.length) throw new Error(`Empty catalog: ${table}`)
    if(table==='retained_species_details'){
      if(new Set(rows.map(r=>r.id)).size!==rows.length||rows.some(r=>!/^[-a-z0-9]+$/.test(r.id)||Object.keys(r).sort().join(',')!=='description,id,name'||typeof r.name!=='string'||!r.name.trim()||typeof r.description!=='string'||catalog.collectible_species.some(s=>s.id===r.id)))throw new Error('Invalid retained species details')
      statements.push(`update public.collectible_species s set name=p.name,description=p.description from (values\n${rows.map(r=>`(${literal(r.id)},${literal(r.name)},${literal(r.description)})`).join(',\n')}) as p(id,name,description) where s.id=p.id;`)
      continue
    }
    const columns = Object.keys(rows[0])
    if (columns.includes('is_native')) throw new Error('is_native is generated, omit it')
    for (const row of rows) if (Object.keys(row).join() !== columns.join()) throw new Error(`Inconsistent columns: ${table}`)
    const key=table==='region_maps'?'region_id':'id'
    statements.push(`insert into public.${table} (${columns.map(identifier).join(',')}) values\n${rows.map(row => `(${columns.map(c => literal(row[c])).join(',')})`).join(',\n')}\non conflict(${key}) do update set ${columns.filter(c => c !== key).map(c => `${identifier(c)}=excluded.${identifier(c)}`).join(',')};`)
  }
  // The manifest controls habitats only for its species; it never deletes species or player data.
  if(!tables||tables.includes('collectible_species')){
    // Retained remote species may not have a complete definition in this catalog.
    // Price overrides update existing rows only; they never recreate or retire species.
    if(!ids&&catalog.retained_species_prices?.length){
      const prices=catalog.retained_species_prices
      if(new Set(prices.map(p=>p.id)).size!==prices.length||prices.some(p=>!/^[-a-z0-9]+$/.test(p.id)||!Number.isSafeInteger(p.sell_price)||p.sell_price<0||catalog.collectible_species.some(s=>s.id===p.id)))throw new Error('Invalid retained species price')
      statements.push(`update public.collectible_species s set sell_price=p.sell_price from (values\n${prices.map(p=>`(${literal(p.id)},${p.sell_price})`).join(',\n')}) as p(id,sell_price) where s.id=p.id;`)
    }
    const species=catalog.collectible_species.filter(r=>!ids||ids.includes(r.id))
    const habitats=catalog.collectible_habitats.filter(r=>species.some(s=>s.id===r.species_id))
    if(species.length)statements.push(`delete from public.collectible_habitats where species_id in (${species.map(r => literal(r.id)).join(',')});`)
    if (habitats.length) statements.push(`insert into public.collectible_habitats(species_id,region_id) values\n${habitats.map(r => `(${literal(r.species_id)},${literal(r.region_id)})`).join(',\n')};`)
  }
  statements.push("notify pgrst, 'reload schema';", 'commit;', '')
  return statements.join('\n')
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/db/catalog.mjs')) {
  const tables=process.argv.flatMap((arg,i)=>arg==='--table'?[process.argv[i+1]]:[])
  const ids=process.argv.flatMap((arg,i)=>arg==='--id'?[process.argv[i+1]]:[])
  const sql = catalogSql(JSON.parse(readFileSync('supabase/catalog/catalog.json', 'utf8')),{tables:tables.length?tables:undefined,ids:ids.length?ids:undefined})
  const output = process.argv[2]
  if (output) {
    if (dirname(resolve(output)) !== resolve('supabase/migrations') || !/^\d{14}_.+\.sql$/.test(output.replaceAll('\\', '/').split('/').at(-1))) throw new Error('Output must be a CLI-created file in supabase/migrations')
    if (!existsSync(output) || readFileSync(output, 'utf8').trim()) throw new Error('Create an empty migration with supabase migration new first; existing SQL is never overwritten')
    writeFileSync(output, sql)
  }
  else process.stdout.write(sql)
}
