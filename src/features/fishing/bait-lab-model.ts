import catalog from '../../../supabase/catalog/catalog.json'
import type { FishingBait } from './api'
import type { Species,CollectibleKind } from '@/features/collection/api'
import {baitWaitFlavor} from './bait-wait-flavor'
import type { Rarity } from '@/lib/game/rarity'

// Read the same staged profiles as the server; this isolated lab never activates them.
export type LabBait = FishingBait & {waitMin:number;waitMax:number;targetKinds:CollectibleKind[];balanceEffect:string;nativeMultiplier:number;period?:'day'|'night'}
export function labBaitsAt(at=Date.now()):LabBait[]{
 const hour=(new Date(at).getUTCHours()+9)%24
 return catalog.fishing_bait_balance_profiles.map(profile=>{
  const source=catalog.fishing_baits.find(b=>b.id===profile.id)
  const night=profile.effect_kind==='day_night'&&(hour<6||hour>=18)
  const targetKinds=profile.target_kinds as CollectibleKind[]
  return {
   id:profile.id,name:profile.name,description:baitWaitFlavor(profile.id),price:profile.price,
   image_path:source?.image_path??'/app-icons/bait.png',
   effect_kind:targetKinds.length===1&&targetKinds[0]==='decoration'?'decoration':'fish',
   effect_description:'미끼 확률로 인한 강제 실패 없이 마지막 게이지 조작으로 포획해요.',
   common_bp:night?profile.night_common_bp!:profile.common_bp,
   rare_bp:night?profile.night_rare_bp!:profile.rare_bp,
   epic_bp:profile.epic_bp,mythic_bp:profile.mythic_bp,failure_bp:0,
   waitMin:night?profile.night_wait_min_seconds!:profile.wait_min_seconds,
   waitMax:night?profile.night_wait_max_seconds!:profile.wait_max_seconds,
   targetKinds,balanceEffect:profile.effect_kind,nativeMultiplier:profile.native_multiplier,
   fish_only:targetKinds.length===1&&targetKinds[0]==='fish',alternating:profile.effect_kind==='alternating',
   successChanceBp:10000,success_chance_bp:10000,
   ...(profile.effect_kind==='day_night'?{period:night?'night' as const:'day' as const}:{}),
  }
 })
}
export const labBaits=labBaitsAt()
export const labRegions = catalog.regions
const species = catalog.collectible_species.map((s) => ({
  ...s,
  speed: Number(s.speed),
  swim_y_min: s.swim_y_min === null ? null : Number(s.swim_y_min),
  swim_y_max: s.swim_y_max === null ? null : Number(s.swim_y_max),
})) as Species[]
export const labStorageKey = 'pongdang:isolated-bait-lab:v1'
export type LabCast = {
  id: string
  baitId: string
  regionId: string
  species: Species
  wait: number
  started: number
  waitReduction?:number
  baitSnapshot?:LabBait
}
export type LabState = {
  gold: number
  inventory: Record<string, number>
  discoveries: string[]
  nextRare: boolean
  pending: LabCast | null
  history: {
    id: string
    name: string
    rarity: Rarity
    won: boolean
    wait: number
    price: number | null
  }[]
}
export function freshLab(): LabState {
  return {
    gold: 50000,
    inventory: Object.fromEntries(labBaits.map((b) => [b.id, 20])),
    discoveries: [],
    nextRare: false,
    pending: null,
    history: [],
  }
}
export function labOdds(bait: LabBait) {
  if (bait.alternating) return '일반 → 희귀 교대'
  const labels = { common: '일반', rare: '희귀', epic: '특급', mythic: '신화' }
  return (Object.keys(labels) as Rarity[])
    .filter((r) => bait[`${r}_bp`] > 0)
    .map((r) => `${labels[r]} ${bait[`${r}_bp`] / 100}%`)
    .join(' · ')
}
export function labTarget(bait: LabBait) {
  if (bait.id === 'bait_first_greeting') return '미발견 개체'
  if (bait.id === 'bait_shooting_star_tail') return '일반 쓰레기 / 신화는 모든 종류'
  if (bait.id === 'bait_grubby_magnet') return '쓰레기 전용'
  if (bait.id === 'bait_snowflake_salt') return '공통종 물고기·쓰레기·장식물'
  if (bait.id === 'bait_sea_memory') return '현재 해역 고유종 우대'
  const labels={fish:'물고기',trash:'쓰레기',decoration:'장식물',map:'지도 조각',relic:'유물'}
  return bait.targetKinds.map(kind=>labels[kind]).join('·')+(bait.targetKinds.length===1?' 전용':'')
}
export function buyLab(state: LabState, id: string): LabState {
  if (state.pending) throw Error('진행 중인 낚시를 먼저 끝내 주세요.')
  const bait = labBaits.find((b) => b.id === id)
  if (!bait || bait.price === null) throw Error('판매하지 않는 미끼예요.')
  if (state.gold < bait.price) throw Error('테스트 골드가 부족해요.')
  return {
    ...state,
    gold: state.gold - bait.price,
    inventory: { ...state.inventory, [id]: (state.inventory[id] ?? 0) + 1 },
  }
}
export function startLab(
  state: LabState,
  baitId: string,
  regionId: string,
  random = Math.random,
  at=Date.now(),
): LabState {
  if (state.pending) return state
  const bait = labBaitsAt(at).find((b) => b.id === baitId)
  if (!bait || !labRegions.some((r) => r.id === regionId))
    throw Error('미끼와 해역을 확인해 주세요.')
  if (!(state.inventory[baitId] > 0)) throw Error('테스트 미끼를 구매해 주세요.')
  let rarity: Rarity = state.nextRare ? 'rare' : 'common'
  if (!bait.alternating) {
    let roll = random() * 10000
    for (const r of ['common', 'rare', 'epic', 'mythic'] as Rarity[]) {
      roll -= bait[`${r}_bp`]
      if (roll < 0) {
        rarity = r
        break
      }
    }
  }
  const all = species.filter((s) => {
    if (baitId === 'bait_first_greeting') return !state.discoveries.includes(s.id)
    if (baitId === 'bait_grubby_magnet') return s.kind === 'trash'
    if (baitId === 'bait_shooting_star_tail') return rarity === 'mythic' || s.kind === 'trash'
    if (baitId === 'bait_snowflake_salt')
      return !s.native_region_id && bait.targetKinds.includes(s.kind)
    return bait.targetKinds.includes(s.kind)
  })
  let pool = all.filter((s) => s.rarity === rarity)
  if (!pool.length && ['bait_first_greeting', 'bait_grubby_magnet'].includes(baitId)) pool = all
  if (!pool.length)
    throw Error(
      baitId === 'bait_first_greeting'
        ? '모든 개체를 발견했어요. 미끼는 소모되지 않았어요.'
        : '해당 등급의 로컬 후보가 없어요.',
    )
  const groups = [
    pool.filter((s) => !s.native_region_id),
    pool.filter((s) => s.native_region_id === regionId),
    pool.filter((s) => s.native_region_id && s.native_region_id !== regionId),
  ]
  const weights = [80,25*bait.nativeMultiplier,5].map((w, i) =>
    groups[i].length ? w : 0,
  )
  let roll = random() * weights.reduce((a, b) => a + b, 0),
    index = 0
  for (; index < 2; index++) {
    roll -= weights[index]
    if (roll < 0) break
  }
  const group = groups[index],
    item = group[Math.min(group.length - 1, Math.floor(random() * group.length))]
  const wait = bait.waitMin + random() * (bait.waitMax - bait.waitMin)
  return {
    ...state,
    nextRare: bait.alternating ? !state.nextRare : state.nextRare,
    inventory: { ...state.inventory, [baitId]: state.inventory[baitId] - 1 },
    pending: {
      id: crypto.randomUUID(),
      baitId,
      regionId,
      species: item,
      wait,
      started: at,
      waitReduction:0,
      baitSnapshot:bait,
    },
  }
}
export function advanceLabWait(state:LabState):LabState{
 if(!state.pending)return state
 const pending=state.pending
 return {...state,pending:{...pending,waitReduction:Math.min(pending.wait,(pending.waitReduction??0)+10)}}
}
export function finishLab(state: LabState, won: boolean): LabState {
  const cast = state.pending
  if (!cast) return state
  const bait = labBaits.find((b) => b.id === cast.baitId)!
  return {
    ...state,
    pending: null,
    discoveries: won ? [...new Set([...state.discoveries, cast.species.id])] : state.discoveries,
    history: [
      {
        id: cast.id,
        name: cast.species.name,
        rarity: cast.species.rarity,
        won,
        wait: cast.wait,
        price: bait.price,
      },
      ...state.history,
    ].slice(0, 100),
  }
}
