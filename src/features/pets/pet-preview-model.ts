import {
  petSpecies,
  petJobs,
  petJobById,
  petJobRewards,
  petBaits,
  petActions,
  PET_DECAY_MS,
  PET_CARE_MS,
  PET_FOOD_GAIN,
  PET_AFFECTION_GAIN,
  PET_FOOD_PRICE,
  PET_SELL_PRICE,
  PET_MAX_LEVEL,
  PET_NAME_MAX_LENGTH,
  type PetSpeciesId,
  type PetCareAction,
  type PetInteractionAction,
  type PetJobId,
  type PetBaitId,
} from './pet-catalog'

export type PreviewJob = { id: PetJobId; runId?: string; startedAt: number; endsAt: number; reward: number; minReward?: number; maxReward?: number }
export const petJobRunKey = (job: PreviewJob) => job.runId ?? `${job.id}:${job.startedAt}:${job.endsAt}`
export type PreviewPet = {
  id: string
  speciesId: PetSpeciesId
  name: string
  level: number
  fullness: number
  affection: number
  decayAt: number
  job: PreviewJob | null
}
export type PreviewCare = {
  id: string
  petId: string
  action: PetInteractionAction
  endsAt: number
}
export type PetCatchKind = 'pet' | 'common' | 'rare' | 'epic' | 'mythic'
export type PetPreviewState = {
  version: 1
  catalogVersion?: 2
  pets: PreviewPet[]
  activeId: string | null
  gold: number
  food: number
  offset: number
  nextId: number
  lastNow: number
  care: PreviewCare | null
  notice: string
  lastCatch: { kind: PetCatchKind; speciesId?: PetSpeciesId } | null
  baitInventory?:Partial<Record<PetBaitId,number>>
}
type Timed = { now: number }
export type PetPreviewAction = Timed &
  (
    | { type: 'select'; id: string | null }
    | { type: 'rename'; id: string; name: string }
    | { type: 'feed'; id?: string }
    | { type: 'care'; action: PetCareAction; id: string }
    | { type: 'complete-care'; id: string }
    | { type: 'buy-food';quantity?:number }
    | { type: 'buy-bait';baitId:PetBaitId;quantity:number }
    | { type: 'start-job'; jobId: PetJobId; roll: number }
    | { type: 'claim-job'; id: string }
    | { type: 'cancel-job'; id: string; runKey: string }
    | { type: 'sell'; id: string }
    | { type: 'enhance'; targetId: string; materialId: string; expectedLevel: number }
    | { type: 'fish'; baitId: PetBaitId; roll: number; speciesRoll: number }
    | { type: 'add-pet'; speciesId: PetSpeciesId }
    | { type: 'advance'; milliseconds: number }
    | { type: 'set-needs'; fullness: number; affection: number }
    | { type: 'reset' }
  )
const bounded = (n: number) => Math.max(0, Math.min(100, Math.floor(n)))
export function petIsWorking(p: PreviewPet, now: number) {
  return !!p.job && p.job.endsAt > now
}
export function petNeedsAt(p: PreviewPet, now: number): PreviewPet {
  const ticks = Math.floor(Math.max(0, now - p.decayAt) / PET_DECAY_MS)
  return ticks
    ? {
        ...p,
        fullness: Math.max(0, p.fullness - ticks),
        affection: Math.max(0, p.affection - ticks),
        decayAt: p.decayAt + ticks * PET_DECAY_MS,
      }
    : p
}
function makePet(speciesId: PetSpeciesId, id: number, now: number): PreviewPet {
  return {
    id: `preview-pet-${id}`,
    speciesId,
    name: petSpecies.find((s) => s.id === speciesId)!.name,
    level: 0,
    fullness: 100,
    affection: 100,
    decayAt: now,
    job: null,
  }
}
export function createPetPreview(now: number): PetPreviewState {
  return {
    version: 1,
    catalogVersion: 2,
    pets: petSpecies.map((s, i) => makePet(s.id, i + 1, now)),
    activeId: 'preview-pet-1',
    gold: 10000,
    food: 10,
    offset: 0,
    nextId: petSpecies.length + 1,
    lastNow: now,
    care: null,
    notice: '',
    lastCatch: null,
  }
}
export function drawPetCatch(baitId: PetBaitId, roll: number): PetCatchKind {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error('INVALID_PREVIEW_ROLL')
  const bait = petBaits.find((b) => b.id === baitId)!
  let upper = 0
  for (const [kind, bp] of [
    ['pet', bait.petBp],
    ['common', bait.commonBp],
    ['rare', bait.rareBp],
    ['epic', bait.epicBp],
    ['mythic', bait.mythicBp],
  ] as const) {
    upper += bp
    if (roll * 10000 < upper) return kind
  }
  return 'mythic'
}
function hydrate(s: PetPreviewState, now: number) {
  const at = Math.max(s.lastNow, now)
  return { ...s, lastNow: at, pets: s.pets.map((p) => petNeedsAt(p, at)) }
}
function message(s: PetPreviewState, notice: string) {
  return { ...s, notice }
}
export function petEnhancementIssue(target: PreviewPet | undefined, material: PreviewPet | undefined) {
  if (!target || !material) return '강화할 펫과 재료 펫을 선택해주세요.'
  if (target.id === material.id) return '자기 자신을 재료로 사용할 수 없어요.'
  if (target.level >= PET_MAX_LEVEL) return '이미 최고 강화 단계예요.'
  if (target.speciesId !== material.speciesId) return '같은 종의 펫만 재료로 사용할 수 있어요.'
  if (material.level !== 0) return '+0 펫만 재료로 사용할 수 있어요.'
  if (target.job || material.job) return '알바 보상을 받은 뒤 강화할 수 있어요.'
  return null
}
export function petPreviewReducer(before: PetPreviewState, a: PetPreviewAction): PetPreviewState {
  if (!Number.isFinite(a.now)) return before
  let s = hydrate(before, a.now)
  const active = s.pets.find((p) => p.id === s.activeId),
    busy = !!s.care
  const update = (id: string, fn: (p: PreviewPet) => PreviewPet) => ({
    ...s,
    pets: s.pets.map((p) => (p.id === id ? fn(p) : p)),
  })
  if (a.type === 'complete-care') {
    if (!s.care || s.care.id !== a.id || s.lastNow < s.care.endsAt) return s
    const target = s.pets.find((p) => p.id === s.care!.petId)
    if (!target) return { ...s, care: null }
    if (s.care.action === 'feed') {
      if (s.food < 1) return { ...s, care: null, notice: '사료가 부족해요.' }
      const gain = Math.min(PET_FOOD_GAIN, 100 - target.fullness)
      return {
        ...update(target.id, (p) => ({ ...p, fullness: p.fullness + gain })),
        food: s.food - 1,
        care: null,
        notice: `맛있게 먹었어요. 포만도 +${gain}`,
      }
    }
    return {
      ...update(target.id, (p) => ({ ...p, affection: Math.min(100, p.affection + PET_AFFECTION_GAIN) })),
      care: null,
      notice: `${target.name}의 애정이 ${Math.min(PET_AFFECTION_GAIN, 100 - target.affection)} 올랐어요.`,
    }
  }
  if (busy) return message(s, '돌봄 동작이 끝나면 다시 할 수 있어요.')
  switch (a.type) {
    case 'enhance': {
      const target = s.pets.find(p => p.id === a.targetId), material = s.pets.find(p => p.id === a.materialId)
      if (target && !material && target.level > a.expectedLevel) return s
      const issue = petEnhancementIssue(target, material)
      if (issue) return message(s, issue)
      if (!target || !material || target.level !== a.expectedLevel) return message(s, '강화 단계가 바뀌었어요. 다시 확인해주세요.')
      return {
        ...s,
        pets: s.pets.filter(p => p.id !== material.id).map(p => p.id === target.id ? {...p, level: p.level + 1} : p),
        activeId: s.activeId === material.id ? target.id : s.activeId,
        notice: `${target.name} +${target.level + 1} 강화 완료!`,
      }
    }
    case 'reset':
      return createPetPreview(a.now - s.offset)
    case 'select':
      return s.pets.some((p) => p.id === a.id) || a.id === null
        ? { ...s, activeId: a.id, notice: '' }
        : s
    case 'rename': {
      const name = a.name.trim()
      if (!name || Array.from(name).length > PET_NAME_MAX_LENGTH) return message(s, `이름은 1~${PET_NAME_MAX_LENGTH}자로 지어주세요.`)
      if (!s.pets.some((p) => p.id === a.id)) return s
      return { ...update(a.id, (p) => ({ ...p, name })), notice: '새 이름으로 불러주세요.' }
    }
    case 'feed': {
      if (!active) return message(s, '먼저 펫을 꺼내주세요.')
      if (petIsWorking(active, s.lastNow)) return message(s, '근무 중인 펫은 돌볼 수 없어요.')
      if (active.fullness >= 100) return message(s, '이미 배가 불러요.')
      if (s.food < 1) return message(s, '상점에서 사료를 구매해주세요.')
      return {
        ...s,
        care: {
          id: a.id ?? `preview-feed-${s.lastNow}`,
          petId: active.id,
          action: 'feed',
          endsAt: s.lastNow + PET_CARE_MS,
        },
        notice: '',
      }
    }
    case 'care': {
      if (!active) return message(s, '먼저 펫을 꺼내주세요.')
      if (petIsWorking(active, s.lastNow)) return message(s, '근무 중인 펫은 돌볼 수 없어요.')
      if (!petActions.some((c) => c.id === a.action)) return s
      return {
        ...s,
        care: { id: a.id, petId: active.id, action: a.action, endsAt: s.lastNow + PET_CARE_MS },
        notice: '',
      }
    }
    case 'buy-bait': {
      const bait=petBaits.find(b=>b.id===a.baitId)
      if(!bait||!Number.isInteger(a.quantity)||a.quantity<1||a.quantity>99)return message(s,'수량은 1~99개로 선택해주세요.')
      if(s.gold<bait.price*a.quantity)return message(s,'테스트 골드가 부족해요.')
      return {...s,gold:s.gold-bait.price*a.quantity,baitInventory:{...s.baitInventory,[bait.id]:(s.baitInventory?.[bait.id]??0)+a.quantity},notice:`${bait.name} ${a.quantity}개를 구매했어요.`}
    }
    case 'buy-food': {
      const quantity=a.quantity??1
      if(!Number.isInteger(quantity)||quantity<1||quantity>99)return message(s,'수량은 1~99개로 선택해주세요.')
      return s.gold < PET_FOOD_PRICE*quantity
        ? message(s, '테스트 골드가 부족해요.')
        : {
            ...s,
            gold: s.gold - PET_FOOD_PRICE*quantity,
            food: s.food + quantity,
            notice: `사료 ${quantity}개를 구매했어요.`,
          }
    }
    case 'start-job': {
      if (!active) return message(s, '알바를 보낼 펫을 꺼내주세요.')
      if (s.pets.some((p) => p.job)) return message(s, '진행 중인 알바를 마치고 보상을 받아주세요.')
      if (active.fullness < 80 || active.affection < 80)
        return message(s, '포만도와 애정이 모두 80 이상이어야 해요.')
      const job = petJobs.find((j) => j.id === a.jobId)
      if (!job || !Number.isFinite(a.roll) || a.roll < 0 || a.roll >= 1) return s
      if (job.speciesId !== active.speciesId) return message(s, '이 친구의 전용 알바를 골라주세요.')
      const range = petJobRewards(job, active.level)
      const reward = range.min + Math.floor(a.roll * (range.max - range.min + 1))
      return {
        ...update(active.id, (p) => ({
          ...p,
          job: {
            id: job.id,
            runId: `preview-job-${s.nextId}`,
            startedAt: s.lastNow,
            endsAt: s.lastNow + job.minutes * 60000,
            reward,
            minReward: range.min,
            maxReward: range.max,
          },
        })),
        nextId: s.nextId + 1,
        notice: `${active.name}이 알바를 떠났어요.`,
      }
    }
    case 'claim-job': {
      const p = s.pets.find((p) => p.id === a.id)
      if (!p?.job || p.job.endsAt > s.lastNow) return s
      return {
        ...update(p.id, (p) => ({ ...p, job: null })),
        gold: s.gold + p.job.reward,
        notice: `수고했어요! 테스트 골드 ${p.job.reward.toLocaleString()}를 받았어요.`,
      }
    }
    case 'cancel-job': {
      const p = s.pets.find(p => p.id === a.id)
      if (!p?.job || petJobRunKey(p.job) !== a.runKey) return s
      if (p.job.endsAt <= s.lastNow) return message(s, '이미 끝난 알바예요. 보상을 받아주세요.')
      return {
        ...update(p.id, p => ({...p, job:null})),
        activeId: p.id,
        notice: `${p.name}의 알바를 취소했어요. 보상은 지급되지 않아요.`,
      }
    }
    case 'sell': {
      const p = s.pets.find((p) => p.id === a.id)
      if (!p) return s
      if (p.job) return message(s, '알바를 마치고 보상을 받은 뒤 판매할 수 있어요.')
      return {
        ...s,
        pets: s.pets.filter((p) => p.id !== a.id),
        activeId: s.activeId === a.id ? null : s.activeId,
        gold: s.gold + PET_SELL_PRICE,
        notice: `${p.name}을 1,000 테스트 골드에 판매했어요.`,
      }
    }
    case 'add-pet': {
      if (!petSpecies.some((p) => p.id === a.speciesId)) return s
      const p = makePet(a.speciesId, s.nextId, s.lastNow)
      return {
        ...s,
        pets: [...s.pets, p],
        activeId: s.activeId ?? p.id,
        nextId: s.nextId + 1,
        notice: '테스트 펫을 추가했어요.',
      }
    }
    case 'fish': {
      const bait = petBaits.find((b) => b.id === a.baitId)
      if (
        !bait ||
        !Number.isFinite(a.roll) ||
        a.roll < 0 ||
        a.roll >= 1 ||
        !Number.isFinite(a.speciesRoll) ||
        a.speciesRoll < 0 ||
        a.speciesRoll >= 1
      )
        return s
      const stocked=s.baitInventory?.[bait.id]??0,cost=stocked>0?0:bait.price
      if (s.gold < cost) return message(s, '테스트 골드가 부족해요.')
      if(stocked>0)s={...s,baitInventory:{...s.baitInventory,[bait.id]:stocked-1}}
      const kind = drawPetCatch(bait.id, a.roll)
      if (kind === 'pet') {
        const species = petSpecies[Math.floor(a.speciesRoll * petSpecies.length)],
          p = makePet(species.id, s.nextId, s.lastNow)
        return {
          ...s,
          pets: [...s.pets, p],
          activeId: s.activeId ?? p.id,
          nextId: s.nextId + 1,
          gold: s.gold - cost,
          lastCatch: { kind, speciesId: species.id },
          notice: `${species.name}을 만났어요! 펫 목록에 추가했어요.`,
        }
      }
      return {
        ...s,
        gold: s.gold - cost,
        lastCatch: { kind },
        notice: '일반 낚시 보상으로 추첨됐어요. 테스트에서는 실제 개체를 지급하지 않아요.',
      }
    }
    case 'advance': {
      if (!Number.isFinite(a.milliseconds) || a.milliseconds < 0 || a.milliseconds > 86400000)
        return s
      return {
        ...hydrate(s, s.lastNow + a.milliseconds),
        offset: s.offset + a.milliseconds,
        notice: '모든 펫의 시간이 함께 흘렀어요.',
      }
    }
    case 'set-needs': {
      if (!active || !Number.isFinite(a.fullness) || !Number.isFinite(a.affection)) return s
      return {
        ...update(active.id, (p) => ({
          ...p,
          fullness: bounded(a.fullness),
          affection: bounded(a.affection),
        })),
        notice: '테스트 상태를 바꿨어요.',
      }
    }
  }
}
// Only this operator sandbox is stored locally, scoped by authenticated account.
// This is never a replica of a server wallet, inventory or owned-pet table.
export function restorePetPreview(raw: string | null, now: number): PetPreviewState {
  try {
    if (!raw) return createPetPreview(now)
    const s = JSON.parse(raw) as PetPreviewState
    if (
      s.version !== 1 ||
      !Array.isArray(s.pets) ||
      !Number.isSafeInteger(s.gold) ||
      s.gold < 0 ||
      !Number.isSafeInteger(s.food) ||
      s.food < 0 ||
      !Number.isSafeInteger(s.nextId) ||
      !Number.isFinite(s.offset) ||
      s.offset < 0 ||
      !Number.isFinite(s.lastNow)
    )
      throw Error('Invalid sandbox')
    if (
      s.pets.some(
        (p) =>
          !p ||
          !petSpecies.some((k) => k.id === p.speciesId) ||
          typeof p.id !== 'string' ||
          typeof p.name !== 'string' ||
          (p.level !== undefined && (!Number.isInteger(p.level) || p.level < 0 || p.level > PET_MAX_LEVEL)) ||
          !Number.isFinite(p.decayAt) ||
          !Number.isInteger(p.fullness) ||
          p.fullness < 0 ||
          p.fullness > 100 ||
          !Number.isInteger(p.affection) ||
          p.affection < 0 ||
          p.affection > 100 ||
          (p.job &&
            (!petJobById(p.job.id) ||
              !Number.isFinite(p.job.endsAt) ||
              !Number.isFinite(p.job.startedAt) ||
              !Number.isSafeInteger(p.job.reward) ||
              p.job.reward < 0)),
      )
    )
      throw Error('Invalid pet')
    if (new Set(s.pets.map((p) => p.id)).size !== s.pets.length)
      throw Error('Duplicate sandbox IDs')
    // New catalog entries must not reuse IDs from existing sandbox pets.
    s.nextId = Math.max(s.nextId, ...s.pets.map(p => Number(p.id.match(/^preview-pet-(\d+)$/)?.[1] ?? 0) + 1))
    // One-time sandbox upgrade: make new species reviewable without resetting
    // names, reinforced pets or an already-running receipt. Later sales persist.
    if (s.catalogVersion !== 2) {
      for (const species of petSpecies.filter(p => 'atlas' in p)) {
        if (!s.pets.some(p => p.speciesId === species.id)) s.pets.push(makePet(species.id, s.nextId++, now + s.offset))
      }
      s.catalogVersion = 2
    }
    // Old operator saves predate enhancement. Keep their pets and running-job
    // receipts; only missing levels default to zero.
    s.pets = s.pets.map(p => ({...p, level: p.level === undefined ? 0 : p.level}))
    // Leaving the page cancels an unfinished preview gesture; it never awards affection.
    return hydrate(
      {
        ...s,
        activeId: s.pets.some((p) => p.id === s.activeId) ? s.activeId : null,
        care: null,
        notice: '',
        lastCatch: null,
      },
      now + s.offset,
    )
  } catch {
    return createPetPreview(now)
  }
}
