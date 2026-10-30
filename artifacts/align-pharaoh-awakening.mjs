import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {spriteAnchorConsensus} from '../scripts/lib/sprite-anchor-consensus.mjs'
const batch=process.argv[2]??'assets/storage-upload/new/20261030-101406',read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),m=read(batch+'/manifest.json'),probes=read(batch+'/anchor-results.json'),raw=read(batch+'/raw-compact-audit.json'),config=read(batch+'/anchor-config.json'),layouts=read('src/features/aquarium/pharaoh-mythic-action-layouts.json'),registration=[],finalConfig=[]
const hash=b=>createHash('sha256').update(b).digest('hex')
for(const a of m.assets.filter(a=>a.role==='sprite-source-current')){
 const audit=raw.find(r=>r.id===a.id);if(!audit?.passed)throw Error('Unsafe source '+a.id)
 const anchors=probes.filter(p=>p.storage_path===a.id),shifts=spriteAnchorConsensus(anchors),pad=64,sourceCell=audit.cell,cell=sourceCell+2*pad
 const {data,info}=await sharp(batch+'/sources/'+a.id+'-normalized.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),out=Buffer.alloc(cell*cell*8*4)
 for(const f of shifts)for(let y=0;y<sourceCell;y++)for(let x=0;x<sourceCell;x++){
  const s=((Math.floor(f.frame/4)*sourceCell+y)*info.width+f.frame%4*sourceCell+x)*4,nx=x+pad-f.dx,ny=y+pad-f.dy
  if(nx<0||ny<0||nx>=cell||ny>=cell){if(data[s+3])throw Error('Clipped RGBA');continue}
  const d=((Math.floor(f.frame/4)*cell+ny)*cell*4+f.frame%4*cell+nx)*4;data.copy(out,d,s,s+4)
  if(data[s+3]&&!data.subarray(s,s+4).equals(out.subarray(d,d+4)))throw Error('RGBA preservation failure')
 }
 const sprite=`fish/mythic/${a.id}_swim8_v${a.version}_sprite.png`,compat=`fish/mythic/${a.id}_compat_v${a.version}_sprite.png`
 const png=await sharp(out,{raw:{width:cell*4,height:cell*2,channels:4}}).png().toBuffer();fs.writeFileSync(batch+'/'+sprite,png);fs.copyFileSync(batch+'/'+sprite,`public/aquarium/swim/${a.id}_swim8_v${a.version}_sprite.png`)
 const small=Buffer.alloc(cell*cell*4*4)
 for(let n=0;n<4;n++)for(let y=0;y<cell;y++)out.copy(small,((Math.floor(n/2)*cell+y)*cell*2+n%2*cell)*4,(y*cell*4+n*cell)*4,(y*cell*4+(n+1)*cell)*4)
 fs.writeFileSync(batch+'/'+compat,await sharp(small,{raw:{width:cell*2,height:cell*2,channels:4}}).png().toBuffer())
 const occupied=Math.max(...audit.bounds.map(b=>Math.max(b.right-b.left+1,b.bottom-b.top+1)))/cell,scale=Number(Math.min(2.3,.88/occupied).toFixed(6)),layout=layouts.find(l=>l.id===a.id)
 Object.assign(layout,{cell,scale,assetVersion:a.version,shifts:Array.from({length:8},()=>[0,0])});for(const alias of [a.id+'_swim8_v'+a.version,a.id+'_compat_v'+a.version])if(!layout.aliases.includes(alias))layout.aliases.push(alias)
 registration.push({id:a.id,storage_path:sprite,source:a.source,rawAudit:audit,normalized_source:'sources/'+a.id+'-normalized.png',cell,sourceCell,padding:pad,scale,probes:anchors,frames:shifts,nontransparentRgbaPreserved:true,method:'Three rigid anchors, median translation encoded in PNG; common padding, constant scale, zero runtime shifts'})
 finalConfig.push(...config.filter(p=>p.id===a.id).map(p=>({...p,file:batch+'/'+sprite,patch:[p.patch[0]+pad,p.patch[1]+pad,p.patch[2],p.patch[3]]})))
 for(const p of [sprite,compat])m.assets.push({id:a.id,role:p===sprite?'swim8':'compat',version:a.version,path:p,target:batch+'/'+p,sha256:hash(fs.readFileSync(batch+'/'+p))})
}
fs.writeFileSync('src/features/aquarium/pharaoh-mythic-action-layouts.json',JSON.stringify(layouts,null,2)+'\n');fs.writeFileSync(batch+'/registration.json',JSON.stringify(registration,null,2)+'\n');fs.writeFileSync(batch+'/final-anchor-config.json',JSON.stringify(finalConfig,null,2)+'\n');fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(JSON.stringify(registration.map(r=>({id:r.id,cell:r.cell,scale:r.scale,preserved:r.nontransparentRgbaPreserved}))))
