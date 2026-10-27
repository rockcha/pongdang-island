import fs from 'node:fs'
const root='assets/storage-upload/new/20261027-090400'
const items=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')).items
const before=JSON.parse(fs.readFileSync('artifacts/pirate-refactor-preflight.json','utf8'))
if(before.project!=='ewafafphiovbpjwogwzn'||before.species.length!==9)throw Error('Missing remote preflight')
const file='supabase/catalog/catalog.json',catalog=JSON.parse(fs.readFileSync(file,'utf8'))
for(const i of items){
 const index=catalog.collectible_species.findIndex(s=>s.id===i.id),previous=catalog.collectible_species[index]
 if(index<0||previous.sell_price!==i.sell_price)throw Error('Identity or price changed unexpectedly')
 const replacement=Object.fromEntries(Object.keys(previous).map(k=>[k,i[k]]))
 catalog.collectible_species[index]=replacement
}
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
console.log('Updated nine existing identities and images; prices and stable IDs preserved; fleet now swims')
