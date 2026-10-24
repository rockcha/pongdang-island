import type { ReactNode } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { GoldIcon } from '@/features/gold/gold-provider'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import type { OwnedCollectible } from '@/features/collection/api'
import { groupCollectibles } from './collectible-groups'

export function CollectibleSaleDialog({
  open,
  onOpenChange,
  items,
  busy,
  disabled,
  error,
  onConfirm,
  children,
  allowBatch = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: OwnedCollectible[]
  busy: boolean
  disabled?: boolean
  error?: string
  onConfirm: () => void
  children?: ReactNode
  allowBatch?: boolean
}) {
  const groups = groupCollectibles(items)
  const valid =
    items.length > 0 &&
    (allowBatch || items.length <= 100) &&
    new Set(items.map((item) => item.id)).size === items.length &&
    groups.every((group) => group.sellable.length === group.items.length)
  const total = items.reduce((sum, item) => sum + item.species.sell_price, 0)
  return (
    <ConfirmDialog
      illustration="fish-sale"
      open={open}
      onOpenChange={onOpenChange}
      title={
        groups.length === 1
          ? `${groups[0].species.name} ${items.length}개를 판매할까요?`
          : `선택한 개체 ${items.length}개를 판매할까요?`
      }
      description="판매한 개체는 되돌릴 수 없어요. 도감의 발견 기록은 유지돼요."
      busy={busy}
      confirmDisabled={disabled || !valid}
      error={error}
      onConfirm={onConfirm}
      confirmLabel="판매하기"
      cancelLabel="돌아가기"
    >
      <div className="space-y-4">
        {children}
        <ul
          aria-label="판매할 개체"
          className="max-h-36 divide-y divide-border overflow-y-auto overscroll-contain rounded-lg border border-border px-3"
        >
          {groups.map((group) => (
            <li key={group.species.id} className="flex min-h-14 items-center gap-3 py-2">
              <CollectibleThumbnail
                path={group.species.thumbnail_path}
                name={group.species.name}
                className="size-9 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate text-xs">{group.species.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                ×{group.items.length}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-xs text-muted-foreground">받을 골드</span>
          <span className="inline-flex items-center gap-1.5 text-xl tabular-nums text-primary">
            <GoldIcon className="size-6" />
            {valid ? total.toLocaleString('ko-KR') : '—'}
          </span>
        </div>
      </div>
    </ConfirmDialog>
  )
}
