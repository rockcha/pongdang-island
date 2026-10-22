import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs'
import {dirname} from 'node:path'
import {createHash} from 'node:crypto'
import {inflateSync} from 'node:zlib'
const root='assets/storage-upload/new/20261022-191931'
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
function alphaBounds(bytes){
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20)
 if(bytes[24]!==8||bytes[25]!==6||bytes[28]!==0)throw Error('Expected non-interlaced 8-bit RGBA')
 const chunks=[]
 for(let pos=8;pos<bytes.length;){const length=bytes.readUInt32BE(pos);if(bytes.toString('ascii',pos+4,pos+8)==='IDAT')chunks.push(bytes.subarray(pos+8,pos+8+length));pos+=length+12}
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*4
 let previous=Buffer.alloc(stride),position=0,minX=width,minY=height,maxX=-1,maxY=-1
 for(let y=0;y<height;y++){
  const filter=raw[position++],row=Buffer.alloc(stride)
  for(let x=0;x<stride;x++){
   const a=x>=4?row[x-4]:0,b=previous[x],c=x>=4?previous[x-4]:0
   const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c)
   const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?(pa<=pb&&pa<=pc?a:pb<=pc?b:c):NaN
   if(!Number.isFinite(predictor))throw Error('Invalid PNG filter')
   row[x]=(raw[position++]+predictor)&255
  }
  for(let x=0;x<width;x++)if(row[x*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
  previous=row
 }
 if(maxX<0||minX<=0||minY<=0||maxX>=width-1||maxY>=height-1)throw Error('Missing transparent margin or empty image')
 return {left:minX,top:minY,right:width-1-maxX,bottom:height-1-maxY}
}
if(process.argv.includes('--finalize')){
 for(const asset of manifest.assets){
  const bytes=readFileSync(root+'/'+asset.storage_path)
  if(bytes.readUInt32BE(0)!==0x89504e47||bytes[25]!==6)throw Error('Expected RGBA PNG: '+asset.id)
  asset.width=bytes.readUInt32BE(16);asset.height=bytes.readUInt32BE(20);asset.sha256=hash(bytes)
  asset.transparentMargins=alphaBounds(bytes)
 }
 writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
 process.exit(0)
}
const path='supabase/catalog/catalog.json',catalog=JSON.parse(readFileSync(path,'utf8'))
for(const asset of manifest.assets){
 if(!asset.source||!asset.prompt)throw Error('Generation metadata incomplete: '+asset.id)
 mkdirSync(dirname(root+'/'+asset.storage_path),{recursive:true})
 copyFileSync(asset.source,root+'/'+asset.storage_path)
 // The historical schema requires a positive stored speed for all trash;
 // fixed motion ignores this compatibility value in the aquarium renderer.
 const row={id:asset.id,kind:'trash',name:asset.name,description:asset.description,swim_y_min:'0.88',swim_y_max:'0.94',speed:'0.001',size:asset.size,rarity:asset.rarity,thumbnail_path:asset.storage_path,sell_price:asset.price,sprite_sheet_path:null,native_region_id:null,movement_type:'fixed',flip_with_direction:false,travel_direction:'both'}
 const existing=catalog.collectible_species.find(r=>r.id===asset.id)
 if(existing&&JSON.stringify(existing)!==JSON.stringify(row))throw Error('Local identity already exists: '+asset.id)
 if(!existing)catalog.collectible_species.push(row)
 for(const region of catalog.regions)if(!catalog.collectible_habitats.some(h=>h.species_id===row.id&&h.region_id===region.id))catalog.collectible_habitats.push({species_id:row.id,region_id:region.id})
}
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
writeFileSync(path,JSON.stringify(catalog,null,2)+'\n')
console.log('Prepared seven shared fixed trash species and 84 habitats.')
