import {readFileSync,writeFileSync} from 'node:fs'

// Package only these reviewed migrations. Do not replace migration history or replay the baseline.
export const productionRemoteBundles = [
 ['bait-production-remote.sql',['20261022161705_bait_production_facilities.sql','20261022161810_bait_production_catalog.sql']],
 ['fuel-production-unlimited-remote.sql',['20261022163942_remove_fuel_production_ownership_limit.sql']],
 ['shared-production-limit-remote.sql',['20261022164056_shared_production_active_limit.sql']],
]
export function productionRemoteSql(files){
 const quote=s=>"'"+s.replaceAll("'","''")+"'"
 const parts=['-- Target project: ewafafphiovbpjwogwzn. Run once, in chronological bundle order.','begin;']
 for(const file of files){
  const sql=readFileSync('supabase/migrations/'+file,'utf8').replaceAll('\r\n','\n').trim()
  // Only remove outer transaction lines; never interpolate SQL through String.replace replacement strings.
  const body=sql.split('\n').filter(line=>!/^\s*(begin|commit);\s*$/i.test(line))
  // PL/pgSQL uses "begin" without a semicolon; its bodies are preserved.
  parts.push('-- '+file,body.join('\n'),
   `insert into supabase_migrations.schema_migrations(version,name,statements) values (${quote(file.slice(0,14))},${quote(file.slice(15,-4))},array[${quote(sql)}]);`)
 }
 parts.push('commit;')
 return parts.join('\n\n')+'\n'
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/scripts/db/production-remote-sql.mjs')){
 for(const [out,files] of productionRemoteBundles){writeFileSync('artifacts/'+out,productionRemoteSql(files));console.log('artifacts/'+out)}
}
