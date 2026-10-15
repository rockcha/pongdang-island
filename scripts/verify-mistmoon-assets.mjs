import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
const root='assets/storage-upload/new/1052/'
const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'))
assert.equal(manifest.assets.length,8)
for(const asset of manifest.assets){
 const png=readFileSync(root+asset.file)
 assert.equal(png.subarray(1,4).toString(),'PNG')
 assert.equal(png[25],6,'Expected RGBA')
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20)
 assert.equal(width,height)
 if(asset.file.endsWith('_sprite.png'))assert.equal(width%2,0,'Sheet must split into 2x2 equal cells')
 assert.ok(asset.storage_path.endsWith(asset.file))
}
for(const id of ['pongdang','coral','mistmoon','starruins','dreamabyss'])assert.ok(existsSync(`public/region-icons/${id}.svg`))
console.log('PASS: 8 RGBA PNG assets, square 2x2 sheets, Storage mappings and 5 public region SVGs.')
