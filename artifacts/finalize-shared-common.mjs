import fs from 'node:fs'
import {createHash} from 'node:crypto'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
const file=root+'/manifest.json',m=JSON.parse(fs.readFileSync(file,'utf8'))
const deployment=JSON.parse(fs.readFileSync('artifacts/shared-common-deployment.json','utf8'))
if(deployment.project!=='ewafafphiovbpjwogwzn'||deployment.species.length!==7||!deployment.deferredSpeciesAbsent)throw Error('Remote common-only deployment not verified')
if(m.deferredItems){fs.writeFileSync('artifacts/deferred-ocean-wonders-planning.json',JSON.stringify(m.deferredItems,null,2)+'\n');m.deferredSpeciesIds=m.deferredItems.map(i=>i.id);delete m.deferredItems}
const releasesFile='src/features/regions/species-releases.json',releases=JSON.parse(fs.readFileSync(releasesFile,'utf8'))
const existing=new Set(releases.flatMap(r=>r.speciesIds)),newIds=m.items.map(i=>i.id).filter(id=>!existing.has(id))
if(newIds.length)releases.push({releasedAt:new Date(deployment.verifiedAt).toISOString(),speciesIds:newIds})
fs.writeFileSync(releasesFile,JSON.stringify(releases,null,2)+'\n')
m.registration='registration.json';m.edgeAudit='audit.json';m.framesReviewed='Right-facing in thumbnails and all four poses; light/dark contact sheets and actual collection/aquarium desktop and mobile DPR1/2/3.'
m.files=m.items.flatMap(i=>['thumbnail','sprite'].map(type=>{
 const relative=type==='thumbnail'?i.thumbnail_path:i.sprite_sheet_path
 const generation=JSON.parse(fs.readFileSync(root+'/generation/'+i.id+'-'+type+'.json','utf8'))
 const source='sources/'+i.id+'-'+type+'.source'
 return {id:i.id,type,local_path:relative,storage_path:relative,raw_source:source,sha256:createHash('sha256').update(fs.readFileSync(root+'/'+relative)).digest('hex'),tool:'built-in image_gen',prompt:generation.prompt,styleReference:i.styleReference,inputReferences:type==='thumbnail'?[i.styleReference]:['guides/'+i.id+'-sprite.png']}
}))
fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n')
console.log('Finalized common-only manifest and actual verified release timestamp')
