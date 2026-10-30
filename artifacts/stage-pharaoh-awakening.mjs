import fs from 'node:fs'
import path from 'node:path'
const batch=process.argv[2]??'assets/storage-upload/new/20261030-101406',m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),stage=process.argv[3]??'.cache/pharaoh-awakening-upload'
for(const a of m.assets.filter(a=>['thumbnail','swim8','compat'].includes(a.role))){const dest=stage+'/'+a.path;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(a.target,dest)}
console.log('Staged immutable artwork PNGs: '+m.assets.filter(a=>['thumbnail','swim8','compat'].includes(a.role)).length)
