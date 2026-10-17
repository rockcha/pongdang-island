import {readFileSync,writeFileSync} from 'node:fs'
const plan=JSON.parse(readFileSync('artifacts/primal-expansion-plan.json','utf8'))
const file='supabase/catalog/catalog.json',catalog=JSON.parse(readFileSync(file,'utf8'))
for(const s of plan){
 if(catalog.collectible_species.some(r=>r.id===s.id))throw new Error('ID already exists: '+s.id)
 const decoration=s.kind==='decoration',folder=s.rarity==='common'?'normal':s.rarity,prefix=`${decoration?'decorations':'fish'}/${folder}/${s.id}`
 catalog.collectible_species.push({id:s.id,kind:decoration?'decoration':'fish',name:s.name,description:s.description,
 swim_y_min:decoration?null:'0.18',swim_y_max:decoration?null:'0.8',speed:decoration?'0':s.size>=150?'0.018':'0.028',size:Math.min(s.size,180),rarity:s.rarity,
 thumbnail_path:prefix+'_thumbnail.png',sell_price:s.price,sprite_sheet_path:!decoration?prefix+'_sprite.png':null,
 native_region_id:'primal',movement_type:decoration?'fixed':'swim',flip_with_direction:!decoration,travel_direction:'both'})
 catalog.collectible_habitats.push({species_id:s.id,region_id:'primal'})
}
catalog.collectible_species.sort((a,b)=>a.id.localeCompare(b.id,'en'))
catalog.collectible_habitats.sort((a,b)=>(a.species_id+'\0'+a.region_id).localeCompare(b.species_id+'\0'+b.region_id,'en'))
writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
console.log('Prepared '+plan.length+' primal-native species; no existing rows changed.')
