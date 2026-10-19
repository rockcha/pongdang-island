// @vitest-environment node
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {catalogSql} from '../scripts/db/catalog.mjs'

it('balances comparable animals by body type while retaining large whales',()=>{
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const size=(id:string)=>catalog.collectible_species.find((s:any)=>s.id===id).size
 expect(size('dreaming-dumbo-octopus')/size('peach-octopus')).toBe(1.5)
 expect(size('muk-celadon-ink-whelk')/size('muk-inkbean-whelk')).toBe(1.5)
 expect(size('coral-crowned-turtle')/size('muk-seal-turtle')).toBeCloseTo(1.25,1)
 expect(size('cloud-humpback')).toBeGreaterThanOrEqual(size('horizon-whale')*.9)
 expect(size('muk-hyeonmu')).toBe(145)
 expect(size('god-devouring-leviathan')).toBe(150)
})

it('keeps the requested Mukhyang grades and exclusive habitats in the generated migration',()=>{
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const fish=catalog.collectible_species.filter((s:any)=>s.native_region_id==='mukhyang'&&s.kind==='fish')
 const decorations=catalog.collectible_species.filter((s:any)=>s.native_region_id==='mukhyang'&&s.kind==='decoration')
 expect(Object.fromEntries(['common','rare','epic','mythic'].map(r=>[r,fish.filter((s:any)=>s.rarity===r).length]))).toEqual({common:8,rare:8,epic:6,mythic:1})
 expect(decorations).toHaveLength(4)
 expect(fish.find((s:any)=>s.id==='muk-hyeonmu')).toMatchObject({rarity:'mythic',movement_type:'crawl',flip_with_direction:true})
 for(const s of [...fish,...decorations])expect(catalog.collectible_habitats.filter((h:any)=>h.species_id===s.id)).toEqual([{species_id:s.id,region_id:'mukhyang'}])
 expect(catalogSql(catalog)).toBe(readFileSync('supabase/migrations/20261018134919_species_proportion_sizes.sql','utf8').replaceAll('\r\n','\n'))
})
