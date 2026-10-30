import catalog from '../supabase/catalog/catalog.json'
import { islandFixture } from './island-fixture'
import type { IslandSnapshot } from '@/features/my-island/api'
export function farmFixture(levels = { office: 0, store: 0, barn: 0 }): IslandSnapshot {
  const s = islandFixture(true)
  s.farm = {
    officeLevel: levels.office,
    plotLimit: [4, 9, 16, 25, 36, 49][levels.office],
    nextCost: levels.office < 5 ? (levels.office + 1) * 5000 : null,
    storeLevel: levels.store,
    storeCapacity: [20, 100, 250, 500, 900, 1500][levels.store],
    barnLevel: levels.barn,
    animalLimit: [0, 3, 5, 8, 12, 16][levels.barn],
    inventory: {},
    serverNow: new Date().toISOString(),
    crops: catalog.farm_crops,
    animalTypes: catalog.farm_animal_types,
    buildings: catalog.farm_building_types.map((b) => {
      const level =
        b.id === 'farm-office' ? levels.office : b.id === 'farm-store' ? levels.store : levels.barn
      return {
        ...b,
        level,
        limit: b.limits[level],
        nextLimit: level < 5 ? b.limits[level + 1] : null,
        nextCost: level < 5 ? (level + 1) * b.unit_cost : null,
      }
    }),
    cropJobs: [],
    animalJobs: [],
  }
  return s
}
