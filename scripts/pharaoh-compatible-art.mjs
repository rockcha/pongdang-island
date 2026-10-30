import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {loadEnvFile} from 'node:process'
import {createHash} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {batch,items} from './prepare-pharaoh-assets.mjs'
const root='.cache/pharaoh-compatible-upload'
const m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),paths=[]
for(const i of items.filter(i=>i.rarity==='mythic')){
 const {data,info}=await sharp(batch+'/'+i.sprite_sheet_path).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cell=info.width/4,width=cell*2,height=cell*2,out=Buffer.alloc(width*height*4)
 for(let n=0;n<4;n++)for(let y=0;y<cell;y++)data.copy(out,((Math.floor(n/2)*cell+y)*width+n%2*cell)*4,(y*info.width+n*cell)*4,(y*info.width+(n+1)*cell)*4)
 const key=`fish/mythic/${i.id}_compat_v1_sprite.png`,png=await sharp(out,{raw:{width,height,channels:4}}).png().toBuffer()
 fs.writeFileSync(batch+'/'+key,png);fs.mkdirSync(path.dirname(root+'/'+key),{recursive:true});fs.writeFileSync(root+'/'+key,png);paths.push(key)
 const asset={id:i.id+'-compat-sprite',target:batch+'/'+key,path:key,derived_from:i.sprite_sheet_path,method:'first four aligned RGBA poses exported to 2x2; no creative edits',frames:4}
 m.assets=m.assets.filter(a=>a.id!==asset.id);m.assets.push(asset)
}
loadEnvFile('.env.storage.local')
const project='ewafafphiovbpjwogwzn';if(process.env.SUPABASE_URL!==`https://${project}.supabase.co`)throw Error('Wrong project')
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const hash=b=>createHash('sha256').update(b).digest('hex'),verified=[]
for(const a of m.assets.filter(a=>a.target.startsWith('public/'))){
 const key=a.target.slice(7),bytes=fs.readFileSync(a.target)
 const {error}=await client.storage.from('collectibles').upload(key,bytes,{upsert:false,contentType:'image/png',cacheControl:'31536000'})
 if(error&&String(error.statusCode)!=='409'&&error.message!=='The resource already exists')throw Error(error.message)
 const r=await fetch(`https://${project}.supabase.co/storage/v1/object/public/collectibles/${key}`);if(!r.ok||hash(Buffer.from(await r.arrayBuffer()))!==hash(bytes))throw Error('Public region art mismatch '+key)
 a.public_storage_path=key;a.public_storage_url=`https://${project}.supabase.co/storage/v1/object/public/collectibles/${key}`;a.uploaded=true;a.uploaded_project=project
 verified.push({path:key,sha256:hash(bytes),bytes:bytes.length})
}
fs.writeFileSync(batch+'/public-region-art-verification.json',JSON.stringify({project,verified_at:new Date().toISOString(),files:verified},null,2)+'\n')
fs.writeFileSync(batch+'/manifest.json',JSON.stringify(m,null,2)+'\n')
console.log(JSON.stringify({compatibleSheets:paths.length,publicRegionArtVerified:verified.length}))
