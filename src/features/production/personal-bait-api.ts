import { createClient } from '@/lib/client'
import { announceBaitReceived } from '@/features/fishing/bait-reward-effect'

export type PersonalBait = {
  id: string
  name: string
  imagePath: string
  unitValue: number
  owned: number
}
export type PersonalBaitJob = {
  id: string
  baitId: string
  baitName: string
  imagePath: string
  quantity: number
  minutes: number
  unitValue: number
  fuelCost: number
  startedAt: string
  completesAt: string
}
export type PersonalBaitState = {
  serverNow: string
  fuel: number
  limits: {
    maxQuantity: number
    minMinutes: number
    maxMinutes: number
    stepMinutes: number
    maxActive: number
  }
  baits: PersonalBait[]
  job: PersonalBaitJob | null
  receipt?: {
    action: 'start' | 'claim'
    jobId: string
    baitId: string
    baitName: string
    quantity: number
    fuelCost: number
    minutes: number
  }
  replayed?: boolean
}
export type PersonalBaitAction = {
  p_action: 'start' | 'claim'
  p_operation_id: string
  p_bait_id?: string
  p_quantity?: number
  p_minutes?: number
  p_job_id?: string
  p_expected_fuel?: number
}
/** Keep the interpolation rational and round only once, like the authoritative RPC. */
export function personalBaitFuel(unitValue: number, quantity: number, minutes: number) {
  if (
    !Number.isSafeInteger(unitValue) ||
    unitValue <= 0 ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 100 ||
    !Number.isSafeInteger(minutes) ||
    minutes < 30 ||
    minutes > 720 ||
    minutes % 30
  )
    return null
  return Math.ceil((quantity * unitValue * 92) / (5750 + 100 * (minutes / 30 - 1)))
}
export async function loadPersonalBaitWorkshop() {
  const { data, error } = await createClient().rpc('personal_bait_workshop_state')
  if (error) throw error
  return data
}
export async function actPersonalBaitWorkshop(args: PersonalBaitAction) {
  const startedAt = performance.now(),
    { data, error } = await createClient().rpc('personal_bait_workshop_action', args)
  if (error) throw error
  if (args.p_action === 'claim' && data.receipt?.action === 'claim')
    announceBaitReceived(
      'personal-bait:' + args.p_operation_id,
      data.receipt.baitId,
      data.receipt.quantity,
      startedAt,
    )
  window.dispatchEvent(new Event('wallet-changed'))
  window.dispatchEvent(new Event('personal-bait-changed'))
  return data
}
export function personalBaitError(cause: unknown) {
  const message = String((cause as { message?: string })?.message ?? '')
  const errors = {
    INSUFFICIENT_FUEL: '연료가 부족해요. 연료를 더 준비해 주세요.',
    PERSONAL_PRODUCTION_BUSY: '진행 중인 생산물을 먼저 수령해 주세요.',
    PRODUCTION_NOT_READY: '아직 미끼를 만들고 있어요.',
    WORKSHOP_JOB_NOT_FOUND: '이미 수령했거나 찾을 수 없는 생산물이에요.',
    FUEL_QUOTE_CHANGED: '미끼 가격이 변경됐어요. 새 연료량을 확인하고 다시 시작해 주세요.',
    BAIT_NOT_AVAILABLE: '현재 생산할 수 없는 미끼예요.',
    BAIT_LIMIT: '미끼 보유 한도에 도달했어요.',
    INVALID_WORKSHOP_QUANTITY: '생산 수량은 1~100개로 선택해 주세요.',
    INVALID_WORKSHOP_TIME: '시간은 30분부터 12시간까지, 30분 단위로 선택해 주세요.',
    OPERATION_CONFLICT: '이전 요청과 정보가 달라요. 같은 요청으로 다시 확인해 주세요.',
  }
  return (
    Object.entries(errors).find(([key]) => message.includes(key))?.[1] ??
    '처리 결과를 확인하지 못했어요. 다시 확인해 주세요.'
  )
}
