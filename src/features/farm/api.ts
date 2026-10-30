import { createClient } from '@/lib/client'
import { accountCommand } from '@/lib/account-command'
import { getQueryAccount, publishAccountResource } from '@/lib/account-cache'
import { playPurchaseSound, playSaleSound } from '@/features/gold/purchase-sound'
import type { IslandSnapshot } from '../my-island/api'
import type { Wallet } from '@/features/gold/wallet'
export type FarmActionArgs = {
  action: 'plant' | 'harvest' | 'feed' | 'collect' | 'sell'
  itemId: string
  kind: string
  quantity: number
  price: number
  operationId: string
}
export type FarmActionResult = {
  island: IslandSnapshot
  wallet: Wallet
  receipt: {
    operationId: string
    applied: boolean
    product?: string
    quantity: number
    delta: number
  }
}
export function farmAction(args: FarmActionArgs) {
  const scope = getQueryAccount()
  return accountCommand(
    async () => {
      const { data, error } = await createClient().rpc('farm_action', {
        p_action: args.action,
        p_item_id: args.itemId,
        p_kind: args.kind,
        p_quantity: args.quantity,
        p_expected_price: args.price,
        p_operation_id: args.operationId,
      })
      if (error) throw error
      return data
    },
    {
      after: (data) => {
        publishAccountResource('island', data.island, scope)
        publishAccountResource('wallet', data.wallet, scope)
        if (args.action === 'sell') playSaleSound(args.operationId)
        else if (args.action === 'plant') playPurchaseSound(args.operationId)
      },
    },
  )
}
