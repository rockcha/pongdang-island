// @vitest-environment node
import fs from 'node:fs'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {expect,it} from 'vitest'
const root='assets/storage-upload/new/20261104-200313'
it('preserves 31 distinct transparent PNG decorations and source provenance',async()=>{
 const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
 expect(manifest.items).toHaveLength(31)
 const hashes=new Set<string>()
 for(const item of manifest.items){
  const file=root+'/'+item.thumbnail_path,buffer=fs.readFileSync(file)
  const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  expect(info.width,item.id).toBe(512);expect(info.height,item.id).toBe(512)
  let transparent=0,visible=0
  for(let i=3;i<data.length;i+=4){if(data[i]===0)transparent++;if(data[i]>=32)visible++}
  expect(transparent/(info.width*info.height),item.id).toBeGreaterThan(0.05)
  expect(visible/(info.width*info.height),item.id).toBeGreaterThan(0.03)
  const hash=createHash('sha256').update(buffer).digest('hex')
  hashes.add(hash);expect(item.final.sha256).toBe(hash)
  expect(item.frames).toBe(1);expect(item.sprite_sheet_path).toBeNull()
  expect(item.referenceImages.length).toBeGreaterThan(0);expect(item.prompt.length).toBeGreaterThan(100)
  expect(fs.existsSync(root+'/sources/'+item.id+'-thumbnail.source')).toBe(true)
 }
 expect(hashes.size).toBe(31)
})
