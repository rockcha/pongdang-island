import legacyProducts from './fixtures/legacy-island-products.json'
import legacyFacilities from './fixtures/legacy-island-facilities.json'
import legacyStarter from './fixtures/legacy-island-starter.json'
import catalog from '../supabase/catalog/catalog.json'
import type { IslandSnapshot } from '@/features/my-island/api'
export function islandFixture(farm = false): IslandSnapshot {
  const starter = farm ? catalog.island_starters[0].blueprint : legacyStarter
  return structuredClone({
    revision: 0,
    document: starter.document,
    items: starter.items.map((i) => ({ id: i.id, type: i.item_id, sellPrice: 0 })),
    stocks: starter.stocks,
    catalog: farm ? catalog.island_shop_items : [...legacyProducts,...legacyFacilities],
  }) as IslandSnapshot
}
