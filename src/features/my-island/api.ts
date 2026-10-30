import { createClient } from '@/lib/client'
import { accountCommand } from '@/lib/account-command'
import {
  getQueryAccount,
  publishAccountResource,
  isCurrentAccount,
  invalidateAccountResource,
} from '@/lib/account-cache'
import { playPurchaseSound, playSaleSound } from '@/features/gold/purchase-sound'
import type { Wallet } from '@/features/gold/wallet'
import type { IslandState, Placement, Cell, FloorPlacement } from './island-model'
export type IslandDocument = {
  layout: Placement[]
  land: Cell[]
  removedLand: Cell[]
  paving: FloorPlacement[]
  signLabels: Record<string, string>
}
export type IslandProduct = {
  id: string
  family: 'decoration' | 'facility' | 'floor' | 'land'
  name: string
  price: number
  width: number
  height: number
  terrain: 'land' | 'water' | 'any' | 'shore'
  rotations: number[]
  text_label: boolean
}
export type IslandSnapshot = {
  farm?: import('../farm/model').FarmProgression
  revision: number
  document: IslandDocument
  items: { id: string; type: string; sellPrice: number }[]
  stocks: Record<string, number>
  catalog: IslandProduct[]
}
export type IslandSaveResult = {
  island: IslandSnapshot
  receipt: { operationId: string; revision: number; applied: boolean }
}
export type IslandTradeArgs = {
  action: 'buy' | 'sell'
  itemId: string
  quantity: number
  price: number
  operationId: string
}
export type IslandTradeResult = {
  island: IslandSnapshot
  wallet: Wallet & { testClaimed: boolean; testEnabled: boolean }
  receipt: {
    operationId: string
    action: 'buy' | 'sell'
    itemId: string
    quantity: number
    itemIds: string[]
    delta: number
    applied: boolean
  }
}
export const ISLAND_GOLD_EFFECT = 'pongdang-island-gold-effect'
export const definitiveIslandError = (error: unknown) =>
  /^[0-9A-Z]{5}$/.test(String((error as { code?: string })?.code ?? ''))
export function islandDocument(state: IslandState): IslandDocument {
  return {
    layout: state.layout,
    land: state.land,
    removedLand: state.removedLand,
    paving: state.paving,
    signLabels: state.signLabels ?? {},
  }
}
export async function readIsland(signal: AbortSignal): Promise<IslandSnapshot> {
  const { data, error } = await createClient().rpc('my_island_state').abortSignal(signal)
  if (error) throw error
  return data
}
export function saveIsland(document: IslandDocument, revision: number, operationId: string) {
  const scope = getQueryAccount()
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('save_my_island', {
        p_document: document,
        p_revision: revision,
        p_operation_id: operationId,
      })
      if (error) throw error
      return data
    },
    {
      after: (data) => {
        publishAccountResource('island', data.island, scope)
      },
    },
  )
}
export function tradeIsland(
  args: IslandTradeArgs,
  onConfirmed?: (result: IslandTradeResult) => boolean,
) {
  const scope = getQueryAccount()
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('trade_island', {
        p_action: args.action,
        p_item_id: args.itemId,
        p_quantity: args.quantity,
        p_expected_price: args.price,
        p_operation_id: args.operationId,
      })
      if (error) throw error
      return data
    },
    {
      after: (data) => {
        const shown = onConfirmed?.(data)
        if (shown && scope && args.action === 'buy')
          window.dispatchEvent(
            new CustomEvent(ISLAND_GOLD_EFFECT, {
              detail: { owner: scope.owner, gold: data.wallet.gold },
            }),
          )
        publishAccountResource('island', data.island, scope)
        publishAccountResource('wallet', data.wallet, scope)
        if (args.action === 'buy') playPurchaseSound(args.operationId)
        else playSaleSound(args.operationId)
      },
    },
  ).catch((error) => {
    if (scope && isCurrentAccount(scope) && definitiveIslandError(error)) {
      invalidateAccountResource('island', scope.owner)
      invalidateAccountResource('wallet', scope.owner)
    }
    throw error
  })
}
export function islandError(error: unknown) {
  const message = String((error as { message?: string })?.message ?? '')
  const errors: Record<string, string> = {
    FARM_PREPARING: '농장은 아직 준비 중이에요.',
    FARM_PLOT_LIMIT: '밭 한도에 도달했어요. 텃밭 관리소를 강화해 주세요.',
    FARM_OFFICE_MAX_LEVEL: '최고 레벨의 텃밭 관리소예요.',
    FARM_OFFICE_NOT_SELLABLE: '텃밭 관리소는 판매할 수 없어요.',
    FARM_OFFICE_UNAVAILABLE: '텃밭 관리소 상태를 다시 확인해 주세요.',
    FARM_BARN_REQUIRED: '외양간을 먼저 지어 주세요.',
    FARM_ANIMAL_LIMIT: '가축 한도에 도달했어요. 외양간을 강화해 주세요.',
    FARM_CROP_ACTIVE: '작물을 먼저 수확해 주세요.',
    FARM_NOT_READY: '아직 준비 중이에요.',
    FARM_STORAGE_FULL: '농장 창고가 가득 찼어요. 판매하거나 창고를 강화해 주세요.',
    FARM_FEED_REQUIRED: '먹이로 쓸 밀이나 옥수수가 부족해요.',
    FARM_ANIMAL_ACTIVE: '이미 먹이를 먹고 생산 중이에요.',
    FARM_CROP_MISSING: '이미 수확한 밭이에요. 다시 확인해 주세요.',
    FARM_ANIMAL_MISSING: '먼저 먹이를 주세요.',
    FARM_INVENTORY_REQUIRED: '보관 중인 수량이 부족해요.',
    INSUFFICIENT_GOLD: '골드가 부족해요.',
    ISLAND_PRICE_CHANGED: '가격이 변경됐어요. 상품을 다시 확인해 주세요.',
    ISLAND_REVISION_CHANGED: '다른 화면에서 섬 배치가 바뀌었어요. 최신 배치를 불러와 주세요.',
    ISLAND_INVENTORY_LIMIT: '보관할 수 있는 수량을 초과했어요.',
    ISLAND_ITEM_NOT_OWNED: '보유하지 않은 구조물이 포함되어 있어요.',
    ISLAND_STOCK_REQUIRED: '보유한 땅이나 타일이 부족해요.',
    ISLAND_STOCK_NOT_STORED: '보관 중인 수량이 부족해요. 배치한 땅이나 타일은 먼저 회수해주세요.',
    ISLAND_PLACEMENT_OVERLAP: '구조물이 겹쳐 있어요. 위치를 확인해 주세요.',
    INVALID_ISLAND_TERRAIN: '구조물이나 타일의 배치 지형을 확인해 주세요.',
    ISLAND_STARTER_NOT_FOR_SALE: '기본 선물은 판매할 수 없어요.',
    OPERATION_CONFLICT: '이전 요청 결과를 먼저 확인해 주세요.',
    ACCOUNT_CHANGED: '계정이 변경됐어요. 현재 계정으로 다시 열어 주세요.',
    GOLD_LIMIT: '골드 보유 한도에 도달했어요.',
  }
  return (
    Object.entries(errors).find(([code]) => message.includes(code))?.[1] ??
    '결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.'
  )
}
