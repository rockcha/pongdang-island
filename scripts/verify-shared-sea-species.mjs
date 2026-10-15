import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'

const root='assets/storage-upload/new/20261015-124837/'
const species=JSON.parse(readFileSync(root+'species.json','utf8'))
const manifest=JSON.parse(readFileSync(root+'manifest.json','utf8'))
const sql=readFileSync('supabase/sql/37-shared-sea-species/01-shared-sea-species.sql','utf8')
assert.equal(species.length,18)
assert.equal(manifest.assets.length,36)
assert.equal(new Set(manifest.assets.map(asset=>asset.storage_path)).size,36)
for(const [id,,rarity] of species){
 const tier=rarity==='common'?'normal':rarity
 for(const suffix of ['thumbnail','sprite']){
  const file=`fish/${tier}/${id}_${suffix}.png`
  const asset=manifest.assets.find(asset=>asset.file===file)
  assert.ok(asset,`Missing manifest asset: ${file}`)
  assert.equal(asset.storage_path,file)
  assert.ok(asset.prompt)
  assert.ok(sql.includes(`'${file}'`),`Missing SQL path: ${file}`)
  assert.ok(existsSync(root+file))
  const png=readFileSync(root+file)
  assert.equal(png.subarray(1,4).toString(),'PNG')
  assert.equal(png[25],6,`Expected RGBA: ${file}`)
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20)
  assert.equal(width,height,`Expected square: ${file}`)
  if(suffix==='sprite')assert.equal(width%2,0,`Expected equal 2x2 cells: ${file}`)
  assert.ok(png.length<10485760,`Exceeds Storage size limit: ${file}`)
 }
}
console.log('PASS: 18 species, 36 square RGBA PNGs, equal 2x2 sheets, matching SQL/manifest paths and Storage size limits.')
