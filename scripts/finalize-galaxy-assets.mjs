import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {items,batch} from './prepare-galaxy-assets.mjs'
import {scenes} from './galaxy-scene-specs.mjs'
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,'')),write=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n')
const manifest=read(batch+'/manifest.json')
const expected=items.reduce((n,i)=>n+(i.frames>1?2:1),0)+scenes.length
if(manifest.assets.length!==expected||new Set(manifest.assets.map(a=>a.path)).size!==expected)throw Error('Incomplete or duplicate assets')
for(const name of ['audit','final-audit']){const rows=read(`${batch}/${name}.json`).results;if(rows.length!==154||rows.some(r=>r.missing||r.warnings.length))throw Error('Artwork audit failed '+name)}
const registrations=read(batch+'/registration.json'),final=[...read(batch+'/final-registered-4.json'),...read(batch+'/final-registered-8.json')]
if(registrations.length!==42||final.length!==42||final.some(r=>r.frames.some(f=>f.dx!==0||f.dy!==0||!Number.isFinite(f.rmse)||f.rmse>40)))throw Error('Final baked anchors failed')
for(const n of ['runtime-review','scene-review','integration-review'])if(!read(`${batch}/${n}.json`).evidence.length)throw Error('Missing runtime review')
for(const r of registrations)r.rawAudit={bounds:r.rawBounds,alphaThreshold:32,source:'Original generated sheet before padding or alignment'}
write(batch+'/registration.json',registrations)
manifest.entries=items.filter(i=>i.frames===8).map(i=>{const a=manifest.assets.find(a=>a.path===i.sprite_sheet_path);return {id:i.id,frames:8,columns:4,storage_path:a.path,source:a.source,prompt:a.prompt,references:a.references??a.referenced_image_paths,action:i.action}})
for(const a of manifest.assets){a.sha256=createHash('sha256').update(readFileSync(batch+'/'+a.path)).digest('hex');a.status='verified-local';}
manifest.status='verified-for-release'
manifest.review={checkedAt:new Date().toISOString(),rawAudit:'audit.json',finalAudit:'final-audit.json',registration:'registration.json',bakedAnchorChecks:['final-registered-4.json','final-registered-8.json'],visualScope:'All 112 thumbnails on light/dark; all 42 sprites at real display sizes; actual Phaser tank and collection previews at 390/1000px; fishing scene and three underwater themes. Local fixture review, not a production account session.'}
write(batch+'/manifest.json',manifest)
const p='assets/references/mythic-sprites/sources.json',s=read(p)
if(!s.manifests.includes(batch+'/manifest.json'))s.manifests.push(batch+'/manifest.json')
write(p,s)
console.log(`Verified ${expected} assets; seven mythic references ready`)
