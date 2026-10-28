import catalog from '../supabase/catalog/catalog.json'
import type { IslandSnapshot } from '@/features/my-island/api'
export function islandFixture(): IslandSnapshot {
  const starter = catalog.island_starters[0].blueprint
  return structuredClone({
    revision: 0,
    document: starter.document,
    items: starter.items.map((i) => ({ id: i.id, type: i.item_id, sellPrice: 0 })),
    stocks: starter.stocks,
    catalog: catalog.island_shop_items,
  }) as IslandSnapshot
}
