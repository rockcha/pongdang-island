// @vitest-environment node
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {expect,it} from 'vitest'
import {MONSTERS} from '@/features/arcade/tower-defense-waves'
it('replaces only the final boss art and preserves every other enemy frame',async()=>{
 const original=await sharp('public/arcade/tower-defense/enemies-v6-sprite.png').ensureAlpha().raw().toBuffer()
 const {data,info}=await sharp('public/arcade/tower-defense/enemies-v7-sprite.png').ensureAlpha().raw().toBuffer({resolveWithObject:true})
 expect([info.width,info.height]).toEqual([1024,18*256])
 const row=1024*256*4
 expect(data.subarray(0,row*11).equals(original.subarray(0,row*11))).toBe(true)
 expect(data.subarray(row*12).equals(original.subarray(row*12))).toBe(true)
 expect(data.subarray(row*11,row*12).equals(original.subarray(row*11,row*12))).toBe(false)
 for(let frame=0;frame<4;frame++){
  let opaque=0,edge=0
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const alpha=data[((11*256+y)*1024+frame*256+x)*4+3]
   if(alpha>128)opaque++
   if(x<4||x>251||y<4||y>251)edge=Math.max(edge,alpha)
  }
  expect(opaque).toBeGreaterThan(1000);expect(edge).toBe(0)
 }
 const manifest=JSON.parse(fs.readFileSync('public/arcade/tower-defense/lunar-boss-art-manifest.json','utf8'))
 for(const file of manifest.files)expect(createHash('sha256').update(fs.readFileSync('public/'+file.path)).digest('hex')).toBe(file.sha256)
 expect(MONSTERS.abyss.name).toBe('월식의 바다용');expect(MONSTERS.abyss.layer).toBe('air')
})
