import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {optimizePng} from '../scripts/optimize-png-lossless.mjs'
const manifestPath='public/branding/pongi-fishing-bite.manifest.json'
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'))
const bytes=optimizePng(readFileSync(manifest.source))
if(bytes[25]!==6)throw Error('Expected alpha channel')
writeFileSync(manifest.path,bytes)
manifest.width=bytes.readUInt32BE(16);manifest.height=bytes.readUInt32BE(20)
manifest.sha256=createHash('sha256').update(bytes).digest('hex')
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
console.log('Saved transparent Pongi illustration: '+manifest.path)
