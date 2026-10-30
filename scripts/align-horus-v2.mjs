import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {spriteAnchorConsensus} from './lib/sprite-anchor-consensus.mjs'
const batch='assets/storage-upload/new/20261030-094918',id='pharaoh-gold-wing-horus'
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')),hash=b=>createHash('sha256').update(b).digest('hex')
const source=`public/aquarium/swim/${id}_swim8_v1_sprite.png`,probes=read('artifacts/previews/horus-refactor/anchor-probe-results.json')
const shifts=spriteAnchorConsensus(probes),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true})
const cell=info.width/4;if(cell!==info.height/2||!Number.isInteger(cell))throw Error('Invalid source grid')
fs.mkdirSync(batch+'/fish/mythic',{recursive:true});fs.mkdirSync(batch+'/sources',{recursive:true})
fs.copyFileSync(source,batch+'/sources/horus-v1-aligned.source')
const out=Buffer.alloc(data.length),bounds=[]
for(const f of shifts){
 const ox=f.frame%4*cell,oy=Math.floor(f.frame/4)*cell;let visible=0,left=cell,top=cell,right=-1,bottom=-1
 for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
  const s=((oy+y)*info.width+ox+x)*4,nx=x-f.dx,ny=y-f.dy
  if(data[s+3]>0){visible++;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
  if(nx<0||ny<0||nx>=cell||ny>=cell){if(data[s+3]>0)throw Error('Translation clips source pixels at frame '+f.frame);continue}
  data.copy(out,((oy+ny)*info.width+ox+nx)*4,s,s+4)
 }
 bounds.push([left,top,right-left+1,bottom-top+1,visible])
}
const sprite=`fish/mythic/${id}_swim8_v2_sprite.png`,compat=`fish/mythic/${id}_compat_v2_sprite.png`
const png=await sharp(out,{raw:info}).png().toBuffer();if(!(await sharp(png).ensureAlpha().raw().toBuffer()).equals(out))throw Error('RGBA changed during export')
fs.writeFileSync(batch+'/'+sprite,png);fs.copyFileSync(batch+'/'+sprite,`public/aquarium/swim/${id}_swim8_v2_sprite.png`)
const small=Buffer.alloc(cell*cell*4*4),width=cell*2
for(let n=0;n<4;n++)for(let y=0;y<cell;y++)out.copy(small,((Math.floor(n/2)*cell+y)*width+n%2*cell)*4,(y*info.width+n*cell)*4,(y*info.width+(n+1)*cell)*4)
fs.writeFileSync(batch+'/'+compat,await sharp(small,{raw:{width,height:cell*2,channels:4}}).png().toBuffer())
const lp='src/features/aquarium/pharaoh-mythic-action-layouts.json',layouts=read(lp),layout=layouts.find(s=>s.id===id)
layout.assetVersion=2;for(const a of [id+'_swim8_v2',id+'_compat_v2'])if(!layout.aliases.includes(a))layout.aliases.push(a)
fs.writeFileSync(lp,JSON.stringify(layouts,null,2)+'\n')
const oldBatch='assets/storage-upload/new/20261030-044000',old=read(oldBatch+'/manifest.json'),prior=old.assets.find(a=>a.path?.includes(id+'_swim8_v1'))
const thumbnail=`fish/mythic/${id}_v1_thumbnail.png`;fs.copyFileSync(oldBatch+'/'+thumbnail,batch+'/'+thumbnail)
const manifest={status:'local-review',tool:'technical integer-pixel alignment; no image regeneration',source_batch:oldBatch,items:[{id,name:'황금 날개의 호루스',kind:'fish',rarity:'mythic',frames:8,thumbnail_path:thumbnail,sprite_sheet_path:sprite}],entries:[{id,kind:'fish',rarity:'mythic',frames:8,columns:4,storage_path:sprite,source:'sources/horus-v1-aligned.source',prompt:prior.prompt,referenceRoles:{source:'existing same-character eight poses, no repaint',anchors:'independent face, crown and chest translations'}}],assets:[sprite,compat].map(p=>({id:p.includes('compat')?id+'-compat-v2':id+'-swim8-v2',path:p,target:batch+'/'+p,sha256:hash(fs.readFileSync(batch+'/'+p))})),source_sha256:hash(fs.readFileSync(source)),nontransparent_rgba_preserved:true,shared_cell:cell,shared_scale:layout.scale}
fs.writeFileSync(batch+'/manifest.json',JSON.stringify(manifest,null,2)+'\n')
fs.writeFileSync(batch+'/registration.json',JSON.stringify([{id,storage_path:sprite,cell,scale:layout.scale,patch:probes[0].patch,probes,frames:shifts,rawAudit:{width:info.width,height:info.height,bounds},method:'Median face/crown/chest translation, encoded in PNG, constant scale; no runtime correction',nontransparentRgbaPreserved:true}],null,2)+'\n')
fs.writeFileSync(batch+'/final-anchors.json',JSON.stringify(probes.map(p=>({...p,file:batch+'/'+sprite})),null,2)+'\n')
console.log(JSON.stringify({batch,shifts,cell,scale:layout.scale,nontransparentRgbaPreserved:true}))
