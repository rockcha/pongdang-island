import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
const root='assets/storage-upload/new/20261015-133650/'
const rows=JSON.parse(readFileSync(root+'species.json','utf8'))
const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'))
const sql=readFileSync('supabase/sql/38-coral-natives/01-coral-natives.sql','utf8')
assert.equal(rows.length,6)
assert.equal(manifest.assets.length,11)
assert.equal(new Set(manifest.assets.map(a=>a.storage_path)).size,11)
for(const row of rows)for(const type of row.kind==='fish'?['thumbnail','sprite']:['thumbnail']){
 const file=`${row.kind==='fish'?'fish':'decorations'}/${row.rarity==='common'?'normal':row.rarity}/${row.id}_${type}.png`
 const asset=manifest.assets.find(a=>a.file===file)
 assert.ok(asset,`Missing asset: ${file}`)
 assert.equal(asset.storage_path,file)
 assert.equal(asset.native_region_id,'coral')
 assert.ok(asset.prompt)
 assert.ok(existsSync(asset.style_reference))
 assert.ok(asset.style_reference.endsWith(row.rarity==='epic'?'epic-mythic-starlight.png':'common-rare-pongi.png'))
 assert.ok(sql.includes(`'${file}'`))
 const png=readFileSync(root+file)
 assert.equal(png.subarray(1,4).toString(),'PNG')
 assert.equal(png[25],6)
 assert.equal(png.readUInt32BE(16),png.readUInt32BE(20))
 if(type==='sprite')assert.equal(png.readUInt32BE(16)%2,0)
 assert.ok(png.length<10485760)
}
console.log('PASS: 6 coral natives, 11 square RGBA PNGs, 2x2 sheets, correct rarity references and matching SQL/Storage paths.')
