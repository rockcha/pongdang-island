import {execFileSync} from 'node:child_process'
import {mkdirSync,readFileSync,writeFileSync,readdirSync,copyFileSync} from 'node:fs'
import {resolve} from 'node:path'
const root=process.cwd(),output=resolve('.cache/firefly-release')
if(!output.startsWith(root+'\\')&&!output.startsWith(root+'/'))throw Error('Release workspace outside repository')
mkdirSync(output,{recursive:true})
const archive=resolve('.cache/firefly-release-baseline.tar')
execFileSync('git',['archive','--format=tar','--output='+archive,'HEAD','supabase','scripts/db','docs/db'])
execFileSync('tar',['-xf',archive,'-C',output])
const gitFile=p=>execFileSync('git',['show','HEAD:'+p],{maxBuffer:20*1024*1024})
const catalog=JSON.parse(gitFile('supabase/catalog/catalog.json').toString('utf8'))
const working=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const compare=(a,b)=>a<b?-1:a>b?1:0
for(const table of ['regions','collectible_species','fishing_rods','fishing_map_blueprints']){
 const isOurs=r=>table==='collectible_species'?r.native_region_id==='firefly':(r.id??r.region_id)==='firefly'
 catalog[table]=[...catalog[table].filter(r=>!isOurs(r)),...working[table].filter(isOurs)]
 catalog[table].sort((a,b)=>compare(a.id??a.region_id,b.id??b.region_id))
}
catalog.collectible_habitats=[...catalog.collectible_habitats.filter(h=>!h.species_id.startsWith('firefly-')),...working.collectible_habitats.filter(h=>h.species_id.startsWith('firefly-'))]
catalog.collectible_habitats.sort((a,b)=>compare(a.species_id,b.species_id)||compare(a.region_id,b.region_id))
writeFileSync(output+'/supabase/catalog/catalog.json',JSON.stringify(catalog,null,2)+'\n')
for(const file of readdirSync('supabase/migrations').filter(f=>/^\d{14}_firefly_/.test(f)))copyFileSync('supabase/migrations/'+file,output+'/supabase/migrations/'+file)
const releases=JSON.parse(gitFile('src/features/regions/species-releases.json').toString('utf8'))
const ownRelease=JSON.parse(readFileSync('src/features/regions/species-releases.json','utf8')).find(r=>r.speciesIds.some(id=>id.startsWith('firefly-')))
if(ownRelease){mkdirSync(output+'/src/features/regions',{recursive:true});writeFileSync(output+'/src/features/regions/species-releases.json',JSON.stringify([ownRelease,...releases],null,2)+'\n')}
// Root modules resolve the installed dependencies; relative DB reads use this
// isolated HEAD + fairy catalog, leaving all pre-existing local work untouched.
for(const [script,args] of [['context.mjs',['write']],['verify.mjs',[]],['context.mjs',['check']]]){
 const result=execFileSync(process.execPath,[resolve('scripts/db/'+script),...args],{cwd:output,encoding:'utf8',maxBuffer:5*1024*1024})
 console.log(result.trim())
}
console.log(JSON.stringify({releaseWorkspace:output,catalogSpecies:catalog.collectible_species.filter(i=>i.native_region_id==='firefly').length,scope:'HEAD plus fairy changes only; pre-existing user edits excluded.'}))
