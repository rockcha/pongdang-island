import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
const batch=process.argv[2]??'assets/storage-upload/new/20261030-101406',read=p=>JSON.parse(fs.readFileSync(p,'utf8')),m=read(batch+'/manifest.json'),catalog=read('supabase/catalog/catalog.json'),layouts=read('src/features/aquarium/pharaoh-mythic-action-layouts.json'),hash=b=>createHash('sha256').update(b).digest('hex')
for(const a of m.assets.filter(a=>a.role==='thumbnail')){
 const s=catalog.collectible_species.find(s=>s.id===a.id);s.thumbnail_path=a.path;s.sprite_sheet_path=m.assets.find(p=>p.id===a.id&&p.role==='compat').path
 if(a.catalog)Object.assign(s,a.catalog)
 if(a.id==='pharaoh-gatekeeper-anubis')Object.assign(s,{movement_type:'swim',swim_y_min:'0.26',swim_y_max:'0.76',speed:'0.012'})
}
const ids=new Set(m.assets.filter(a=>a.role==='thumbnail').map(a=>a.id))
m.items=catalog.collectible_species.filter(s=>ids.has(s.id))
m.entries=m.assets.filter(a=>a.role==='sprite-source-current').map(a=>({id:a.id,kind:'fish',rarity:'mythic',frames:8,columns:4,storage_path:m.assets.find(p=>p.id===a.id&&p.role==='swim8').path,source:a.source,prompt:a.prompt,referenceRoles:{identity:m.assets.find(p=>p.id===a.id&&p.role==='thumbnail').path,layout:'guides/'+a.id+'-compact.png',style:'assets/references/collectible-style/epic-mythic-starlight.png; retained through approved identity'},shared_scale:layouts.find(l=>l.id===a.id).scale}))
fs.writeFileSync('supabase/catalog/catalog.json',JSON.stringify(catalog,null,2)+'\n');fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
const sources=read('assets/references/mythic-sprites/sources.json');if(!sources.manifests.includes(batch+'/manifest.json'))sources.manifests.push(batch+'/manifest.json');fs.writeFileSync('assets/references/mythic-sprites/sources.json',JSON.stringify(sources,null,2)+'\n')
// Extend the existing thumbnail export profile for these four versioned keys only.
const file='assets/optimized-thumbnails/manifest.json',optimized=read(file),runtimeFile='src/features/collection/thumbnail-assets.json',runtime=read(runtimeFile),profile='webp-q88-alpha100-inside-v1'
if(optimized.profile!==profile)throw Error('Unexpected thumbnail profile')
for(const a of m.assets.filter(a=>a.role==='thumbnail')){
 const source=batch+'/'+a.source,input=fs.readFileSync(source),metadata=await sharp(input).metadata(),record={key:a.path,source,sourceHash:hash(input),sourceBytes:input.length,sourceWidth:metadata.width,sourceHeight:metadata.height,small:null,large:null}
 for(const [label,size] of [['small',320],['large',640]]){
  const filename=hash(Buffer.concat([input,Buffer.from(profile+':'+size)])).slice(0,24)+'-'+size+'.webp',result=await sharp(input).resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:88,alphaQuality:100,smartSubsample:true,effort:5}).toBuffer({resolveWithObject:true})
  fs.writeFileSync('public/game-art/thumbnails/'+filename,result.data);record[label]={url:'/game-art/thumbnails/'+filename,bytes:result.data.length,width:result.info.width,height:result.info.height}
 }
 optimized.items=optimized.items.filter(r=>r.key!==a.path);optimized.items.push(record);runtime[a.path]={small:record.small.url,large:record.large.url}
}
optimized.items.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);const sum=k=>optimized.items.reduce((n,r)=>n+(k==='sourceBytes'?r.sourceBytes:r[k].bytes),0),sourceBytes=sum('sourceBytes'),smallBytes=sum('small'),largeBytes=sum('large')
optimized.summary={count:optimized.items.length,sourceBytes,smallBytes,largeBytes,smallReductionPercent:Number((100*(1-smallBytes/sourceBytes)).toFixed(2))}
fs.writeFileSync(file,JSON.stringify(optimized,null,2)+'\n');fs.writeFileSync(runtimeFile,JSON.stringify(Object.fromEntries(Object.entries(runtime).sort(([a],[b])=>a<b?-1:a>b?1:0)),null,2)+'\n')
console.log('Registered four local mythic artwork versions and floating Anubis; remote unchanged')
