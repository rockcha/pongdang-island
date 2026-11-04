import {execFileSync} from 'node:child_process'
import {statSync} from 'node:fs'

// check-rules is read-only: do not change the developer's sparse checkout.
const files=execFileSync('git',['ls-files','-z'],{maxBuffer:20_000_000})
const selected=execFileSync('git',['sparse-checkout','check-rules','--no-cone','--rules-file','.github/ci-sparse-checkout','-z'],{input:files,maxBuffer:20_000_000}).toString().split('\0').filter(Boolean)
const all=files.toString().split('\0').filter(Boolean),included=new Set(selected)
for(const file of all){
 const required=!file.startsWith('assets/')&&!file.startsWith('artifacts/')||file.startsWith('assets/')&&file.endsWith('.json')
 if(included.has(file)!==required)throw Error(`Unexpected CI checkout selection: ${file}`)
}
const bytes=list=>list.reduce((total,file)=>total+statSync(file).size,0)
const database=selected.filter(file=>!file.startsWith('public/'))
console.log(JSON.stringify({trackedFiles:all.length,ciFiles:selected.length,trackedBytes:bytes(all),ciBytes:bytes(selected),databaseCiBytes:bytes(database),omittedBytes:bytes(all.filter(f=>!included.has(f)))},null,2))
