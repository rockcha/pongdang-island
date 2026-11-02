import fs from 'node:fs'
import {items} from './prepare-hangang-refinement.mjs'
import {catalogSql} from './db/catalog.mjs'
const file='supabase/catalog/catalog.json',catalog=JSON.parse(fs.readFileSync(file,'utf8'))
for(const item of items){
 const row=catalog.collectible_species.find(s=>s.id===item.id)
 row.sprite_sheet_path=item.compatibility_path??item.sprite_sheet_path
 if(item.id==='hangang-mago-creator')Object.assign(row,{rarity:'mythic',sell_price:3800,size:170,thumbnail_path:item.thumbnail_path})
 if(item.frames===4)Object.assign(row,{movement_type:'swim',swim_y_min:'0.2',swim_y_max:'0.78',speed:'0.02',flip_with_direction:true})
}
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
const migration='supabase/migrations/20261102001612_hangang_mythic_motion_refinement.sql'
if(fs.readFileSync(migration,'utf8').trim())throw Error('Migration is already populated; never overwrite applied history')
fs.writeFileSync(migration,catalogSql(catalog,{tables:['collectible_species'],ids:items.map(i=>i.id)}))
console.log(JSON.stringify({updated:items.map(i=>i.id),promoted:'hangang-mago-creator',migration}))
