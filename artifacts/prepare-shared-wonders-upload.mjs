import fs from 'node:fs'
import path from 'node:path'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
const m=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')),destination='artifacts/shared-wonders-upload'
for(const i of m.items)for(const relative of [i.thumbnail_path,i.sprite_sheet_path]){
 const target=destination+'/'+relative
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(root+'/'+relative,target)
}
console.log('Staged '+m.items.length*2+' common-only PNG assets')
