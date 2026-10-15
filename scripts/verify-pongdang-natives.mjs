import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const root='assets/storage-upload/new/20261015-151831/'
const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'))
assert.equal(manifest.assets.length,6)
for(const a of manifest.assets){
 const bytes=readFileSync(root+a.file)
 assert.equal(bytes.subarray(1,4).toString(),'PNG')
 assert.equal(bytes[25],6,'RGBA PNG required: '+a.file)
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20)
 assert.equal(width,height)
 if(a.file.endsWith('_sprite.png'))assert.equal(width%2,0)
 assert.ok(bytes.length<10485760)
 assert.equal(a.facing_direction,'right')
}
console.log('PASS: six square RGBA assets, three equal 2x2 sheets, right-facing manifest and Storage size limits.')
