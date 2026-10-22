import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {inflateSync} from 'node:zlib'
import {optimizePng} from '../scripts/optimize-png-lossless.mjs'
function chunks(png:Buffer){const result=[];for(let p=8;p<png.length;){const n=png.readUInt32BE(p),type=png.toString('ascii',p+4,p+8);result.push({type,data:png.subarray(p+8,p+8+n)});p+=12+n}return result}
it('preserves every filtered pixel byte and all alpha/color metadata without growing files',()=>{
 const source=readFileSync('public/aquarium/swim/shared-island-hafgufa_swim8_sprite.png')
 const optimized=optimizePng(source),before=chunks(source),after=chunks(optimized)
 expect(optimized.length).toBeLessThanOrEqual(source.length)
 const pixels=(c:ReturnType<typeof chunks>)=>inflateSync(Buffer.concat(c.filter(x=>x.type==='IDAT').map(x=>x.data)))
 expect(pixels(after).equals(pixels(before))).toBe(true)
 expect(after.filter(c=>c.type!=='IDAT')).toEqual(before.filter(c=>c.type!=='IDAT'))
 expect(optimizePng(optimized).equals(optimized)).toBe(true)
})
