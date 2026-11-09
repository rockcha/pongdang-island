import fs from 'node:fs'
import {batch,items} from './prepare-weather-decoration-assets.mjs'
for(const i of items)for(const p of [i.thumbnail_path,i.sprite_sheet_path])if(!fs.existsSync(`${batch}/${p}`))throw Error('Incomplete decoration artwork: '+p)
const file='supabase/catalog/catalog.json',catalog=JSON.parse(fs.readFileSync(file,'utf8')),columns=Object.keys(catalog.collectible_species[0])
for(const i of items){
 const values={...i,native_region_id:null}
 const row=Object.fromEntries(columns.map(k=>[k,values[k]]))
 if(Object.values(row).some(v=>v===undefined))throw Error('Missing catalog column: '+i.id)
 const index=catalog.collectible_species.findIndex(s=>s.id===i.id)
 if(index<0)catalog.collectible_species.push(row);else catalog.collectible_species[index]=row
}
catalog.collectible_species.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n')
const weather=catalog.collectible_species.filter(s=>s.weather_type).map(s=>({...s,swim_y_min:s.swim_y_min===null?null:Number(s.swim_y_min),swim_y_max:s.swim_y_max===null?null:Number(s.swim_y_max),speed:Number(s.speed)}))
fs.writeFileSync('src/features/fishing/weather-creatures.json',JSON.stringify(weather,null,2)+'\n')
console.log(JSON.stringify({decorations:items.length,weatherPreview:weather.length}))
