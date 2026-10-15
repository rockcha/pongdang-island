import { createClient } from '@/lib/client'
import type { CatalogEntry, Species } from '@/features/collection/api'

// The harbor needs the catalog and discoveries, not the ownership inventory.
export async function loadHarborCatalog(): Promise<CatalogEntry[]> {
 const client=createClient()
 const [catalog,discoveries]=await Promise.all([
  client.from('collectible_species').select('*'),
  client.from('player_discoveries').select('species_id'),
 ])
 if(catalog.error||discoveries.error)throw catalog.error||discoveries.error
 const rows=catalog.data as unknown as Species[]
 const discoveriesRows=discoveries.data as unknown as {species_id:string}[]
 const found=new Set(discoveriesRows.map(item=>item.species_id))
 return rows.map(item=>({...item,discovered:found.has(item.id),habitats:[]}))
}
