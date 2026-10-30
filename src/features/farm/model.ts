export type FarmCrop = {
  id: string
  name: string
  seed_price: number
  grow_seconds: number
  yield_quantity: number
  sell_price: number
}
export type FarmAnimal = {
  id: string
  name: string
  produce_id: string
  produce_name: string
  produce_seconds: number
  feed_quantity: number
  yield_quantity: number
  produce_sell_price: number
}
export type FarmBuilding = {
  id: string
  name: string
  unit_cost: number
  limits: number[]
  level: number
  limit: number
  nextLimit: number | null
  nextCost: number | null
}
export type CropJob = { item_id: string; crop_id: string; planted_at: string; ready_at: string }
export type AnimalJob = { item_id: string; animal_id: string; fed_at: string; ready_at: string }
export type FarmProgression = {
  officeLevel: number
  plotLimit: number
  nextCost: number | null
  storeLevel?: number
  storeCapacity?: number
  barnLevel?: number
  animalLimit?: number
  inventory?: Record<string, number>
  serverNow?: string
  crops?: FarmCrop[]
  animalTypes?: FarmAnimal[]
  buildings?: FarmBuilding[]
  cropJobs?: CropJob[]
  animalJobs?: AnimalJob[]
}
export const farmAnimalIds = ['farm-chicken', 'farm-cow', 'farm-sheep']
export const farmBuildingIds = ['farm-office', 'farm-store', 'farm-barn']
export function remaining(ready: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(ready) - now) / 1000))
  return seconds >= 3600
    ? `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`
    : seconds >= 60
      ? `${Math.floor(seconds / 60)}분 ${seconds % 60}초`
      : `${seconds}초`
}
export function duration(seconds: number) {
  return seconds >= 3600 ? `${seconds / 3600}시간` : `${seconds / 60}분`
}
