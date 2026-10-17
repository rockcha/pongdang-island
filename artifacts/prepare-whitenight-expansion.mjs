import {readFileSync,writeFileSync} from 'node:fs'
const file='supabase/catalog/catalog.json',c=JSON.parse(readFileSync(file,'utf8'))
const plan=JSON.parse(readFileSync('artifacts/whitenight-expansion-plan.json','utf8'))
for(const s of plan){
 if(c.collectible_species.some(r=>r.id===s.id))throw Error('Already registered: '+s.id)
 const fixed=s.movement==='fixed',decoration=s.kind==='decoration',folder=s.rarity==='common'?'normal':s.rarity
 const prefix=`${decoration?'decorations':'fish'}/${folder}/${s.id}`
 c.collectible_species.push({id:s.id,kind:decoration?'decoration':'fish',name:s.name,description:s.description,
 swim_y_min:decoration?null:fixed?'0.84':'0.18',swim_y_max:decoration?null:fixed?'0.94':'0.8',speed:decoration?'0':fixed?'0.012':s.size>=150?'0.018':'0.028',size:s.size,rarity:s.rarity,
 thumbnail_path:prefix+'_thumbnail.png',sell_price:s.price,sprite_sheet_path:decoration?null:prefix+'_sprite.png',native_region_id:'whitenight',movement_type:decoration||fixed?'fixed':'swim',flip_with_direction:!decoration&&!fixed,travel_direction:'both'})
 c.collectible_habitats.push({species_id:s.id,region_id:'whitenight'})
}
c.collectible_species.sort((a,b)=>a.id.localeCompare(b.id,'en'))
c.collectible_habitats.sort((a,b)=>a.species_id.localeCompare(b.species_id,'en')||a.region_id.localeCompare(b.region_id,'en'))
writeFileSync(file,JSON.stringify(c,null,2)+'\n')
console.log('Prepared 23 fish and 9 decorations, all whitenight native.')
