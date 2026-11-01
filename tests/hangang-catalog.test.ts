import {expect,it} from 'vitest'
import catalog from '../supabase/catalog/catalog.json'
it('registers the six-piece Korean destination and a 2500-gold native rod',()=>{
 const region=catalog.regions.find(r=>r.id==='hangang')!
 expect(region.name).toBe('한강의 불빛나루')
 const map=catalog.fishing_map_blueprints.find(r=>r.region_id==='hangang')!
 expect(map.piece_count).toBe(6)
 expect(map.piece_rarities).toEqual(['common','common','rare','rare','epic','epic'])
 expect(catalog.fishing_rods.find(r=>r.id==='hangang')).toMatchObject({region_id:'hangang',price:2500})
})
it('prices the complete roster by kind and gives every mobile collectible explicit heights',()=>{
 const roster=catalog.collectible_species.filter(s=>s.native_region_id==='hangang')
 expect(roster).toHaveLength(84)
 expect(new Set(roster.map(s=>s.id)).size).toBe(84)
 const counts={fish:{common:13,rare:14,epic:8,mythic:4},decoration:{common:10,rare:8,epic:8},trash:{common:11,rare:8}}
 for(const [kind,rarities] of Object.entries(counts))for(const [rarity,count] of Object.entries(rarities)){
  const rows=roster.filter(s=>s.kind===kind&&s.rarity===rarity)
  expect(rows).toHaveLength(count)
  const old=catalog.collectible_species.filter(s=>s.native_region_id==='pharaoh'&&s.kind===kind&&s.rarity===rarity)
  expect(rows.reduce((sum,s)=>sum+s.sell_price,0)/rows.length).toBeGreaterThanOrEqual(old.reduce((sum,s)=>sum+s.sell_price,0)/old.length)
 }
 for(const row of roster){
  expect(catalog.collectible_habitats.filter(h=>h.species_id===row.id)).toEqual([{species_id:row.id,region_id:'hangang'}])
  if(row.kind==='decoration'){expect(Number(row.speed)).toBe(0);expect(row.swim_y_min).toBeNull()}
  else{expect(Number(row.speed)).toBeGreaterThan(0);expect(Number(row.swim_y_min)).toBeGreaterThanOrEqual(0);expect(Number(row.swim_y_max)).toBeLessThanOrEqual(1);expect(Number(row.swim_y_min)).toBeLessThanOrEqual(Number(row.swim_y_max))}
 }
})
