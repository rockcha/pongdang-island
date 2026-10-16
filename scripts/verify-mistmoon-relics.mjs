import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const root='assets/storage-upload/new/20261015-173555/'
const m=JSON.parse(readFileSync(root+'manifest.json','utf8'))
assert.equal(m.assets.length,6)
assert.equal(new Set(m.assets.map(a=>a.storage_path)).size,6)
assert.equal(m.species.filter(s=>s.kind==='trash').length,3)
assert.equal(m.species.filter(s=>s.kind==='decoration').length,3)
for(const a of m.assets){
 const b=readFileSync(root+a.file)
 assert.equal(b.subarray(1,4).toString(),'PNG')
 assert.equal(b[25],6,a.file+' must be RGBA')
 assert.equal(b.readUInt32BE(16),b.readUInt32BE(20))
 assert.ok(b.length<10485760)
 assert.ok(a.prompt&&a.reference)
 assert.equal(a.storage_path,a.file)
 assert.ok(m.species.some(s=>s.path===a.storage_path&&s.rarity===a.rarity))
}
console.log('PASS: 3 trash, 3 decorations, 6 square RGBA PNGs and matching Storage paths.')
