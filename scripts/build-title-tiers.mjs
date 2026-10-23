import {readFileSync,writeFileSync} from 'node:fs'
const catalog=JSON.parse(readFileSync(new URL('../supabase/catalog/catalog.json',import.meta.url),'utf8'))
const names={}
for(const title of catalog.title_catalog){
 if(names[title.name]!==undefined)throw Error(`Duplicate title name: ${title.name}`)
 if(![1,2,3,4].includes(title.tier))throw Error(`Invalid title tier: ${title.id}`)
 names[title.name]=title.tier
}
const output=JSON.stringify(names,null,2)+'\n'
const path=new URL('../src/features/titles/title-name-tiers.json',import.meta.url)
if(process.argv.includes('--check')){
 if(readFileSync(path,'utf8')!==output)throw Error('Title tiers are stale. Run npm run titles:generate.')
}else writeFileSync(path,output)
