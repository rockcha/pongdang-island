import fs from 'node:fs'
import path from 'node:path'

const root=process.argv[2]
if(!root)throw Error('Usage: node scripts/sync-shared-decorations-catalog.mjs <batch>')
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'))
const file='supabase/catalog/catalog.json',catalog=JSON.parse(fs.readFileSync(file,'utf8'))
const columns=Object.keys(catalog.collectible_species[0]),ids=new Set()
for(const item of manifest.items){
 if(ids.has(item.id))throw Error('Duplicate decoration id: '+item.id)
 ids.add(item.id)
 const values={id:item.id,kind:'decoration',name:item.name,description:item.description,
  // The DB requires null swimming bounds for stationary scenery; placement is editable.
  swim_y_min:null,swim_y_max:null,speed:'0',size:item.size,rarity:item.rarity,
  thumbnail_path:item.thumbnail_path,sell_price:item.sell_price,sprite_sheet_path:null,
  native_region_id:null,movement_type:'fixed',flip_with_direction:false,travel_direction:'both',weather_type:null}
 if(columns.some(key=>!(key in values)))throw Error('Unhandled catalog column')
 const row=Object.fromEntries(columns.map(key=>[key,values[key]])),index=catalog.collectible_species.findIndex(s=>s.id===row.id)
 if(index<0)catalog.collectible_species.push(row);else catalog.collectible_species[index]=row
}
catalog.collectible_habitats=catalog.collectible_habitats.filter(h=>!ids.has(h.species_id))
for(const id of ids)for(const region of catalog.regions)catalog.collectible_habitats.push({species_id:id,region_id:region.id})
// Preserve existing row order so a new batch does not rewrite unrelated catalog data.
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
console.log('Registered '+ids.size+' common-pool decorations across '+catalog.regions.length+' regions locally')
