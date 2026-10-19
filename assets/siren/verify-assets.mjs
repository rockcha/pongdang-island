import fs from 'node:fs/promises'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
const m=JSON.parse(await fs.readFile('assets/siren/manifest.json','utf8'))
const files=[...m.assets.map(a=>({path:a.path,key:a.storage_path})),...m.sprites.map(a=>({path:a.path,key:a.storage_path})),...m.environmentAssets.filter(a=>a.storage_path).map(a=>({path:m.batch+'/'+a.storage_path,key:a.storage_path}))]
if(new Set(files.map(f=>f.key)).size!==62)throw Error('Expected 62 distinct collectible PNG assets')
for(const f of files){const png=await fs.readFile(f.path);if(png.toString('ascii',1,4)!=='PNG')throw Error('Invalid PNG: '+f.path);if(png[25]!==6)throw Error('Expected RGBA transparency support: '+f.path);f.hash=createHash('sha256').update(png).digest('hex')}
for(const j of m.sprites){const png=await fs.readFile(j.path);const ratio=png.readUInt32BE(16)/png.readUInt32BE(20);if(Math.abs(ratio-j.columns/2)>.001)throw Error('Invalid atlas grid: '+j.id)}
if(process.argv.includes('--remote')){
 loadEnvFile('.env.storage.local')
 const base=process.env.SUPABASE_URL
 if(new URL(base).hostname!=='ewafafphiovbpjwogwzn.supabase.co')throw Error('Wrong Supabase target')
 let next=0,checked=0
 async function worker(){while(next<files.length){const f=files[next++];const response=await fetch(`${base}/storage/v1/object/public/collectibles/${f.key}`);if(!response.ok)throw Error(`${response.status}: ${f.key}`);const bytes=Buffer.from(await response.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==f.hash)throw Error('Remote image differs: '+f.key);checked++}}
 await Promise.all([worker(),worker(),worker(),worker()])
 console.log(`PASS: ${checked} public Storage downloads match local SHA-256 hashes`)
}else console.log(`PASS: ${files.length} local PNGs and 24 sprite atlas grids`)
