import {loadEnvFile} from 'node:process'
import {readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
loadEnvFile('.env.storage.local')
const root='assets/storage-upload/new/20261017-095349'
const files=[]
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())walk(p);else if(e.name.endsWith('.png'))files.push(p)}}
walk(root)
const hash=b=>createHash('sha256').update(b).digest('hex')
let next=0;const results=[]
await Promise.all(Array.from({length:4},async()=>{while(next<files.length){const file=files[next++],key=file.slice(root.length+1),expected=readFileSync(file);const r=await fetch(process.env.SUPABASE_URL+'/storage/v1/object/public/collectibles/'+key);if(!r.ok)throw new Error('Image unavailable: '+key);const actual=Buffer.from(await r.arrayBuffer());if(hash(actual)!==hash(expected))throw new Error('Image mismatch: '+key);results.push({key,bytes:actual.length,sha256:hash(actual)})}}))
writeFileSync(root+'/upload-verification.json',JSON.stringify({verifiedAt:new Date().toISOString(),projectHost:new URL(process.env.SUPABASE_URL).hostname,files:results.sort((a,b)=>a.key.localeCompare(b.key))},null,2)+'\n')
console.log(`Verified ${results.length} public PNGs against local SHA-256 hashes.`)
