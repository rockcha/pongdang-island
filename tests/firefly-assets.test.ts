// @vitest-environment node
import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
const batch='assets/storage-upload/new/20261029-032100'
const manifest=JSON.parse(readFileSync(batch+'/manifest.json','utf8'))
it('keeps every generated animation inside its original cells and contains real pose changes',async()=>{
 const creatures=manifest.items.filter((i:{kind:string})=>i.kind==='fish')
 expect(creatures).toHaveLength(37)
 for(const item of creatures){
  const asset=manifest.assets.find((a:{path:string})=>a.path===item.sprite_sheet_path)
  expect(asset,item.id).toBeTruthy()
  const {data,info}=await sharp(asset.original).ensureAlpha().extractChannel('alpha').raw().toBuffer({resolveWithObject:true})
  const columns=item.rarity==='mythic'?4:2,cw=Math.floor(info.width/columns),ch=Math.floor(info.height/2),margin=columns===4?Math.floor(cw*.08):1
  const finalMetadata=await sharp(batch+'/'+item.sprite_sheet_path).metadata(),finalWidth=finalMetadata.width!/columns,finalHeight=finalMetadata.height!/2
  expect(Math.abs(info.width/columns-info.height/2),item.id).toBeLessThanOrEqual(1)
  const hashes=[]
  for(let f=0;f<columns*2;f++){
   const ox=f%columns*cw,oy=Math.floor(f/columns)*ch
   for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
    if(x>=margin&&x<cw-margin&&y>=margin&&y<ch-margin)continue
    expect(data[(oy+y)*info.width+ox+x],`${item.id} frame ${f} edge ${x},${y}`).toBeLessThan(32)
   }
   const pose=await sharp(batch+'/'+item.sprite_sheet_path).extract({left:f%columns*finalWidth,top:Math.floor(f/columns)*finalHeight,width:finalWidth,height:finalHeight}).raw().toBuffer()
   hashes.push(createHash('sha256').update(pose).digest('hex'))
  }
  expect(new Set(hashes.slice(0,4)).size,item.id).toBeGreaterThanOrEqual(3)
  if(columns===4)expect(hashes.slice(4).some(hash=>!hashes.slice(0,4).includes(hash)),item.id+' additional action').toBe(true)
 }
},60000)
it('uses opaque rigid anatomy patches with finite registration evidence for all 37 creatures',async()=>{
 const registrations=JSON.parse(readFileSync(batch+'/registration.json','utf8'))
 expect(registrations).toHaveLength(37)
 for(const r of registrations){
  const [left,top,width,height]=r.patch
  const {data,info}=await sharp(batch+'/'+r.storage_path).ensureAlpha().extract({left,top,width,height}).raw().toBuffer({resolveWithObject:true})
  let samples=0,opaque=0
  for(let y=0;y<height;y+=3)for(let x=0;x<width;x+=3){samples++;if(data[(y*width+x)*info.channels+3]>=128)opaque++}
  expect(opaque,r.id).toBeGreaterThanOrEqual(20)
  expect(opaque/samples,r.id).toBeGreaterThanOrEqual(.5)
  for(const f of r.frames){expect(Number.isFinite(f.rmse),r.id).toBe(true);expect(f.rmse,r.id).toBeLessThanOrEqual(60)}
 }
})
