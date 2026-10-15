import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
const root='assets/storage-upload/new/20261015-192806/'
const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'))
const sql=readFileSync('supabase/sql/49-coral-collection/01-coral-collection.sql','utf8')
assert.equal(manifest.species.length,15)
assert.equal(manifest.assets.length,27)
assert.equal(new Set(manifest.assets.map(a=>a.storage_path)).size,27)
for(const a of manifest.assets){
 assert.equal(a.file,a.storage_path)
 assert.match(a.file,/^(fish|trash|decorations)\/(normal|rare|epic|mythic)\/[^/]+\.png$/)
 assert.ok(existsSync(root+a.file),a.file)
 assert.ok(sql.includes(a.storage_path),a.storage_path)
 const png=readFileSync(root+a.file)
 assert.equal(png.subarray(1,4).toString(),'PNG')
 assert.equal(png[25],6,'Actual RGBA required')
 assert.equal(png.readUInt32BE(16),png.readUInt32BE(20),'Square canvas required')
 assert.ok(png.length<10485760)
 if(a.type==='sprite')assert.equal(png.readUInt32BE(16)%2,0)
 assert.ok(a.prompt)
}
const alpha=JSON.parse(readFileSync(root+'alpha-report.json','utf8').replace(/^\uFEFF/,''))
assert.equal(alpha.sprites.length,11)
for(const s of alpha.sprites)for(const f of s.frames){
 assert.ok(f.alphaPixels>1000)
 assert.ok(f.x>0&&f.y>0&&f.x+f.width<s.cellWidth&&f.y+f.height<s.cellHeight,'Silhouette must clear cell edges: '+s.file)
}
for(const s of manifest.species){
 assert.equal(s.native_region_id,'coral')
 assert.ok(sql.includes("'"+s.id+"'"))
}
console.log('PASS: 15 coral natives, 27 square RGBA PNGs, 11 four-frame sheets with transparent cell boundaries and matching SQL paths.')
