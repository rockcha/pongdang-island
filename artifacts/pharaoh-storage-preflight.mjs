import fs from 'node:fs'
import {query,project} from './pharaoh-remote.mjs'
const rows=await query("select id,public,file_size_limit,allowed_mime_types from storage.buckets where id='collectibles'")
if(rows.length!==1||!rows[0].public||!rows[0].allowed_mime_types.includes('image/png'))throw Error('Unexpected collectibles bucket')
const b='assets/storage-upload/new/20261030-044000',m=JSON.parse(fs.readFileSync(b+'/manifest.json'))
const paths=[...m.items.flatMap(i=>[i.thumbnail_path,...(i.sprite_sheet_path?[i.sprite_sheet_path]:[])]),...['thumbnail','reel-frame','reel-rotor','float'].map(f=>'equipment/rods/pharaoh/'+f+'.png')]
if(paths.length!==93||new Set(paths).size!==93)throw Error('Incomplete image roster')
for(const p of paths)if(!fs.existsSync(b+'/'+p)||fs.statSync(b+'/'+p).size>rows[0].file_size_limit)throw Error('Missing or oversized image '+p)
console.log(JSON.stringify({project,bucket:rows[0],readyImages:paths.length}))
