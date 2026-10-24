import {readFileSync,writeFileSync,copyFileSync} from 'node:fs'
import {resolve,dirname,relative} from 'node:path'
import {createHash} from 'node:crypto'
const [manifestPath,id,source]=process.argv.slice(2)
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'))
const entry=manifest.files.find(file=>file.theme_id===id)
if(!entry)throw Error('Unknown theme '+id)
const root=resolve(dirname(manifestPath)),destination=resolve(root,entry.local_path)
if(relative(root,destination).startsWith('..'))throw Error('Destination outside batch')
const bytes=readFileSync(source),width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20)
if(width<1200||height<700||width/height<1.3||width/height>2.1)throw Error('Unexpected panorama dimensions '+width+'x'+height)
copyFileSync(source,destination)
Object.assign(entry,{status:'generated',generated_source:source,width,height,sha256:createHash('sha256').update(bytes).digest('hex')})
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
console.log(JSON.stringify({id,width,height,generated:manifest.files.filter(file=>file.status==='generated').length,total:manifest.files.length}))
