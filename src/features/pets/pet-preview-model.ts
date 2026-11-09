import {
  petSpecies,
  petJobs,
  petBaits,
  petActions,
  PET_DECAY_MS,
  PET_CARE_MS,
  PET_FOOD_GAIN,
  PET_FOOD_PRICE,
  PET_SELL_PRICE,
  type PetSpeciesId,
  type PetCareAction,
  type PetInteractionAction,
  type PetJobId,
  type PetBaitId,
} from './pet-catalog'

export type PreviewJob = { id: PetJobId; startedAt: number; endsAt: number; reward: number }
export type PreviewPet = {
  id: string
  speciesId: PetSpeciesId
  name: string
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
}
type Timed = { now: number }
export type PetPreviewAction = Timed &
  (
    | { type: 'select'; id: string | null }
    | { type: 'rename'; id: string; name: string }
    | { type: 'feed'; id?: string }
    | { type: 'care'; action: PetCareAction; id: string }
    | { type: 'complete-care'; id: string }
    | { type: 'buy-food' }
    | { type: 'start-job'; jobId: PetJobId; roll: number }
    | { type: 'claim-job'; id: string }
    | { type: 'sell'; id: string }
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
    fullness: 100,
    affection: 100,
    decayAt: now,
    job: null,
  }
}
export function createPetPreview(now: number): PetPreviewState {
  return {
    version: 1,
    pets: petSpecies.map((s, i) => makePet(s.id, i + 1, now)),
    activeId: 'preview-pet-1',
    gold: 10000,
    food: 10,
    offset: 0,
    nextId: 5,
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
      ...update(target.id, (p) => ({ ...p, affection: Math.min(100, p.affection + 1) })),
      care: null,
      notice: `${target.name}의 애정이 1 올랐어요.`,
    }
  }
  if (busy) return message(s, '돌봄 동작이 끝나면 다시 할 수 있어요.')
  switch (a.type) {
    case 'reset':
      return createPetPreview(a.now - s.offset)
    case 'select':
      return s.pets.some((p) => p.id === a.id) || a.id === null
        ? { ...s, activeId: a.id, notice: '' }
        : s
    case 'rename': {
      const name = a.name.trim()
      if (!name || Array.from(name).length > 12) return message(s, '이름은 1~12자로 지어주세요.')
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
    case 'buy-food':
      return s.gold < PET_FOOD_PRICE
        ? message(s, '테스트 골드가 부족해요.')
        : {
            ...s,
            gold: s.gold - PET_FOOD_PRICE,
            food: s.food + 1,
            notice: '사료 1개를 구매했어요.',
          }
    case 'start-job': {
      if (!active) return message(s, '알바를 보낼 펫을 꺼내주세요.')
      if (s.pets.some((p) => p.job)) return message(s, '진행 중인 알바를 마치고 보상을 받아주세요.')
      if (active.fullness < 80 || active.affection < 80)
        return message(s, '포만도와 애정이 모두 80 이상이어야 해요.')
      const job = petJobs.find((j) => j.id === a.jobId)
      if (!job || !Number.isFinite(a.roll) || a.roll < 0 || a.roll >= 1) return s
      const reward = job.min + Math.floor(a.roll * (job.max - job.min + 1))
      return {
        ...update(active.id, (p) => ({
          ...p,
          job: {
            id: job.id,
            startedAt: s.lastNow,
            endsAt: s.lastNow + job.hours * 3600000,
            reward,
          },
        })),
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
      if (s.gold < bait.price) return message(s, '테스트 골드가 부족해요.')
      const kind = drawPetCatch(bait.id, a.roll)
      if (kind === 'pet') {
        const species = petSpecies[Math.floor(a.speciesRoll * petSpecies.length)],
          p = makePet(species.id, s.nextId, s.lastNow)
        return {
          ...s,
          pets: [...s.pets, p],
          activeId: s.activeId ?? p.id,
          nextId: s.nextId + 1,
          gold: s.gold - bait.price,
          lastCatch: { kind, speciesId: species.id },
          notice: `${species.name}을 만났어요! 펫 목록에 추가했어요.`,
        }
      }
      return {
        ...s,
        gold: s.gold - bait.price,
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
          !Number.isFinite(p.decayAt) ||
          !Number.isInteger(p.fullness) ||
          p.fullness < 0 ||
          p.fullness > 100 ||
          !Number.isInteger(p.affection) ||
          p.affection < 0 ||
          p.affection > 100 ||
          (p.job &&
            (!petJobs.some((j) => j.id === p.job!.id) ||
              !Number.isFinite(p.job.endsAt) ||
              !Number.isFinite(p.job.startedAt) ||
              !Number.isSafeInteger(p.job.reward) ||
              p.job.reward < 0)),
      )
    )
      throw Error('Invalid pet')
    if (new Set(s.pets.map((p) => p.id)).size !== s.pets.length)
      throw Error('Duplicate sandbox IDs')
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
