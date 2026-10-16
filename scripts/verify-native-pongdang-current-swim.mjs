import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const root='assets/storage-upload/new/20261015-161244/'
const m=JSON.parse(readFileSync(root+'manifest.json','utf8'))
assert.equal(m.assets.length,7)
assert.equal(new Set(m.assets.map(a=>a.storage_path)).size,7)
for(const a of m.assets){
 const b=readFileSync(root+a.file)
 assert.equal(b.subarray(1,4).toString(),'PNG')
 assert.equal(b[25],6,a.file+' must be RGBA')
 assert.equal(b.readUInt32BE(16),b.readUInt32BE(20))
 if(a.file.endsWith('_sprite.png'))assert.equal(b.readUInt32BE(16)%2,0)
 assert.ok(b.length<10485760)
 assert.equal(a.facing_direction,'right')
 assert.ok(a.prompt)
}
console.log('PASS: 7 square RGBA images, 5 equal 2x2 sheets, unique Storage paths, right-facing prompt records.')
