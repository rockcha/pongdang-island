import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {readdir,readFile,writeFile,mkdir,access} from 'node:fs/promises'
import path from 'node:path'

const profile='webp-q88-alpha100-inside-v1',out='public/game-art/thumbnails'
const manifestPath='assets/optimized-thumbnails/manifest.json'
const catalog=JSON.parse(await readFile('supabase/catalog/catalog.json','utf8'))
const keys=[...new Set([...catalog.collectible_species,...catalog.region_maps].map(s=>s.thumbnail_path))].sort()
const candidates=new Map()
async function walk(dir){
 for(const e of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,e.name)
  if(e.isDirectory())await walk(file)
  else if(e.name.endsWith('.png')){
   const p=file.replaceAll('\\','/'),key=p.match(/(?:^|\/)((?:fish|trash|decorations|map)\/(?:normal|rare|epic|mythic|routes)\/[^/]+\.png)$/)?.[1]
   if(key){const list=candidates.get(key)??[];list.push(p);candidates.set(key,list)}
  }
 }
}
await walk('assets/storage-upload')
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
let previous
try{previous=JSON.parse(await readFile(manifestPath,'utf8'))}catch{}
await mkdir(out,{recursive:true});await mkdir(path.dirname(manifestPath),{recursive:true})
await mkdir('.cache/thumbnail-sources',{recursive:true})
const records=[],runtime={},missing=[]
for(const key of keys){
 const files=(candidates.get(key)??[]).sort((a,b)=>{
  const stamp=p=>p.match(/\/(\d{8}-\d{6})\//)?.[1]??''
  return stamp(a)<stamp(b)?1:stamp(a)>stamp(b)?-1:a.localeCompare(b)
 })
 let source=files[0],input
 if(source)input=await readFile(source)
 else{
  source=`.cache/thumbnail-sources/${hash(key).slice(0,24)}.png`
  try{input=await readFile(source)}catch{
   if(!process.argv.includes('--fetch-missing')){missing.push(key);continue}
   const url='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/'+key
   const response=await fetch(url)
   if(!response.ok)throw Error(`Cannot read public original ${key}: ${response.status}`)
   input=Buffer.from(await response.arrayBuffer());await writeFile(source,input)
  }
 }
 const sourceHash=hash(input),metadata=await sharp(input).metadata()
 const old=previous?.profile===profile?previous.items.find(i=>i.key===key&&i.sourceHash===sourceHash):null
 if(old){
  try{await access('public'+old.small.url);await access('public'+old.large.url);records.push(old);runtime[key]={small:old.small.url,large:old.large.url};continue}catch{}
 }
 const record={key,source,sourceHash,sourceBytes:input.length,sourceWidth:metadata.width,sourceHeight:metadata.height,small:null,large:null}
 for(const [label,size] of [['small',320],['large',640]]){
  if(label==='large'&&Math.max(metadata.width,metadata.height)<=320){record.large=record.small;continue}
  const filename=hash(Buffer.concat([input,Buffer.from(profile+':'+size)])).slice(0,24)+'-'+size+'.webp'
  const result=await sharp(input).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:88,alphaQuality:100,smartSubsample:true,effort:5}).toBuffer({resolveWithObject:true})
  await writeFile(out+'/'+filename,result.data)
  record[label]={url:'/game-art/thumbnails/'+filename,bytes:result.data.length,width:result.info.width,height:result.info.height}
 }
 records.push(record);runtime[key]={small:record.small.url,large:record.large.url}
 if(records.length%100===0)console.log(`Prepared ${records.length}/${keys.length}`)
}
if(missing.length)throw Error(`${missing.length} originals are not local; run with --fetch-missing to cache the public originals. First: ${missing[0]}`)
const sourceBytes=records.reduce((sum,i)=>sum+i.sourceBytes,0),smallBytes=records.reduce((sum,i)=>sum+i.small.bytes,0),largeBytes=records.reduce((sum,i)=>sum+i.large.bytes,0)
const summary={count:records.length,sourceBytes,smallBytes,largeBytes,smallReductionPercent:Number((100*(1-smallBytes/sourceBytes)).toFixed(2))}
await writeFile(manifestPath,JSON.stringify({profile,sizes:[320,640],summary,items:records},null,2)+'\n')
await writeFile('src/features/collection/thumbnail-assets.json',JSON.stringify(runtime,null,2)+'\n')
console.log(summary)
