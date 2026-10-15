import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const root='assets/storage-upload/new/20261015-165350/'
const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'))
const species=JSON.parse(readFileSync(root+'species.json','utf8'))
assert.equal(species.length,8)
assert.deepEqual(['common','rare','epic','mythic'].map(r=>species.filter(s=>s.rarity===r).length),[3,2,2,1])
assert.equal(manifest.assets.length,16)
assert.equal(new Set(manifest.assets.map(a=>a.storage_path)).size,16)
for(const a of manifest.assets){
 const b=readFileSync(root+a.file)
 assert.equal(b.subarray(1,4).toString(),'PNG')
 assert.equal(b[25],6,a.file+' must be RGBA')
 assert.equal(b.readUInt32BE(16),b.readUInt32BE(20))
 if(a.file.endsWith('_sprite.png'))assert.equal(b.readUInt32BE(16)%2,0)
 assert.ok(b.length<10485760)
 assert.equal(a.facing_direction,'right')
 assert.ok(a.prompt)
}
console.log('PASS: 8 species, rarity counts 3/2/2/1, 16 square RGBA PNGs and recorded right-facing prompts.')
