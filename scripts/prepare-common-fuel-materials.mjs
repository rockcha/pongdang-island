import {readFileSync,writeFileSync} from 'node:fs'

const root=process.argv[2]
if(!root)throw Error('Usage: node scripts/prepare-common-fuel-materials.mjs <batch-folder> [--catalog]')
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const rows=manifest.entries.map(e=>({
 id:e.id,kind:e.kind,name:e.name,description:e.description,
 swim_y_min:e.kind==='fish'?'0.18':'0.9',swim_y_max:e.kind==='fish'?'0.78':'0.98',
 speed:e.kind==='fish'?'0.022':'0.001',size:e.kind==='fish'?(e.id.endsWith('saury')?76:60):48,
 rarity:'common',thumbnail_path:e.thumbnail_path,sell_price:e.sell_price,
 sprite_sheet_path:e.kind==='fish'?e.storage_path:null,native_region_id:null,
 movement_type:e.kind==='fish'?'swim':'fixed',flip_with_direction:e.kind==='fish',travel_direction:'both'
}))
if(process.argv.includes('--catalog')){
 for(const row of rows){
  const existing=catalog.collectible_species.find(s=>s.id===row.id)
  if(existing)throw Error('Identity already exists: '+row.id)
  catalog.collectible_species.push(row)
  for(const region of catalog.regions)catalog.collectible_habitats.push({species_id:row.id,region_id:region.id})
 }
 catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id))
 catalog.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id)||a.region_id.localeCompare(b.region_id))
 writeFileSync('supabase/catalog/catalog.json',JSON.stringify(catalog,null,2)+'\n')
}
console.log('Prepared '+rows.length+' common identities and '+rows.length*catalog.regions.length+' habitats')
