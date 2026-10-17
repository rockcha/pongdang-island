import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs'
const {batch,species}=JSON.parse(readFileSync('artifacts/cloudferry-expansion-plan.json','utf8'))
const sources=[]
for(const name of ['thumbnail-sources','sprite-sources','margin-fix-sources','extra-margin-sources','last-margin-sources','guided-sources'])if(existsSync(batch+'/'+name+'.json')){const record=JSON.parse(readFileSync(batch+'/'+name+'.json','utf8'));if(record.errors?.length)throw Error('Resolve generation failures in '+name);sources.push(...record.entries)}
const selected=new Map(sources.map(s=>[s.storage_path,s]))
const expected=species.flatMap(s=>[s.thumbnail,...(s.sprite?[s.sprite]:[])])
if(expected.length!==47||expected.some(path=>!selected.has(path)))throw Error('Missing selected image source')
for(const path of expected)copyFileSync(selected.get(path).path,batch+'/'+path)
writeFileSync(batch+'/generation-sources.json',JSON.stringify({tool:'built-in image_gen',entries:[...selected.values()]},null,2)+'\n')
console.log('Selected and synchronized 47 final PNGs from their generation sources.')
