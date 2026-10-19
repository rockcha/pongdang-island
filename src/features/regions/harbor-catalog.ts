import { createClient } from '@/lib/client'
import type { CatalogEntry, Species } from '@/features/collection/api'

async function loadAll<T>(page:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>):Promise<T[]>{
 const rows:T[]=[]
 const pageSize=500
 for(let from=0;;from+=pageSize){
  const result=await page(from,from+pageSize-1)
  if(result.error)throw result.error
  const batch=result.data??[]
  rows.push(...batch)
  if(batch.length<pageSize)return rows
 }
}

// The harbor needs the catalog and discoveries, not the ownership inventory.
export async function loadHarborCatalog(): Promise<CatalogEntry[]> {
 const client=createClient()
 const [catalog,discoveries,habitats]=await Promise.all([
  loadAll((from,to)=>client.from('collectible_species').select('*').order('id').range(from,to)),
  loadAll((from,to)=>client.from('player_discoveries').select('species_id').order('species_id').range(from,to)),
  loadAll((from,to)=>client.from('collectible_habitats').select('species_id,region_id').order('species_id').order('region_id').range(from,to)),
 ])
 const rows=catalog as unknown as Species[]
 const discoveriesRows=discoveries as unknown as {species_id:string}[]
 const found=new Set(discoveriesRows.map(item=>item.species_id))
 const bySpecies=new Map<string,{id:string;name:string}[]>()
 for(const h of habitats as unknown as {species_id:string;region_id:string}[]){const list=bySpecies.get(h.species_id)??[];list.push({id:h.region_id,name:h.region_id});bySpecies.set(h.species_id,list)}
 return rows.map(item=>({...item,discovered:found.has(item.id),habitats:bySpecies.get(item.id)??[]}))
}
