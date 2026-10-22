import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'

const root=process.argv[2]||'assets/storage-upload/new/20261023-034400'
if(!/^assets\/storage-upload\/new\/\d{8}-\d{6}$/.test(root))throw Error('Expected a workspace art batch')
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const paths=[...new Set(manifest.items.flatMap(p=>[p.thumbnail_path,p.sprite_sheet_path,p.catalog_sprite_sheet_path].filter(Boolean)))]
const expected=manifest.items.reduce((n,p)=>n+1+(p.sprite_sheet_path?1:0)+(p.catalog_sprite_sheet_path&&p.catalog_sprite_sheet_path!==p.sprite_sheet_path?1:0),0)
if(paths.length!==expected)throw Error('Missing or duplicate final PNG paths')
const results=[]
let cursor=0
await Promise.all(Array.from({length:4},async()=>{
 while(cursor<paths.length){
  const path=paths[cursor++]
  const response=await fetch('https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/'+path)
  if(!response.ok)throw Error(`${path}: HTTP ${response.status}`)
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
  const local=readFileSync(root+'/'+path),remote=Buffer.from(await response.arrayBuffer())
  if(hash(local)!==hash(remote))throw Error('Remote bytes differ: '+path)
  results.push({path,bytes:local.length,sha256:hash(local)})
 }
}))
results.sort((a,b)=>a.path.localeCompare(b.path))
writeFileSync(root+'/upload-verification.json',JSON.stringify({project:'ewafafphiovbpjwogwzn',verifiedAt:new Date().toISOString(),count:results.length,files:results},null,2)+'\n')
console.log(`PASS: ${results.length} public Storage downloads match local SHA-256 bytes.`)
