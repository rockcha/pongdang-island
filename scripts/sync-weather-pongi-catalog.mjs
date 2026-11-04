import fs from 'node:fs'
const batch='assets/storage-upload/new/20261104-170551'
const manifest=JSON.parse(fs.readFileSync(`${batch}/manifest.json`,'utf8'))
const catalogFile='supabase/catalog/catalog.json'
const catalog=JSON.parse(fs.readFileSync(catalogFile,'utf8'))
const columns=Object.keys(catalog.collectible_species[0])
const rows=manifest.items.map(item=>{
 const values={id:item.id,kind:'fish',name:item.name,description:item.description,swim_y_min:String(item.swim_y_min),swim_y_max:String(item.swim_y_max),speed:String(item.speed),size:120,rarity:'common',thumbnail_path:item.thumbnail_path,sell_price:item.sell_price,sprite_sheet_path:item.sprite_sheet_path,native_region_id:null,movement_type:'swim',flip_with_direction:true,travel_direction:'both',weather_type:item.weather_type}
 if(columns.some(key=>!(key in values)))throw Error('Unexpected species column')
 return Object.fromEntries(columns.map(key=>[key,values[key]]))
})
for(const row of rows){const index=catalog.collectible_species.findIndex(s=>s.id===row.id);if(index<0)catalog.collectible_species.push(row);else catalog.collectible_species[index]=row}
catalog.collectible_species.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
fs.writeFileSync(catalogFile,JSON.stringify(catalog,null,2)+'\n')
// Derived subset for reward-free operator previews. The authoritative catalog is above.
fs.writeFileSync('src/features/fishing/weather-creatures.json',JSON.stringify(rows.map(s=>({...s,swim_y_min:Number(s.swim_y_min),swim_y_max:Number(s.swim_y_max),speed:Number(s.speed)})),null,2)+'\n')
console.log(`Registered ${rows.length} weather fish locally. No remote writes or release timestamps.`)
