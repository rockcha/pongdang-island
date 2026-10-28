import type { ReactNode } from 'react'
import { Check, Package, MapPin, Minus, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { GoldIcon } from '@/features/gold/gold-provider'
export type AcquiredIslandItem = {
  name: string
  quantity: number
  delta: number
  itemIds: string[]
  kind: 'item' | 'floor' | 'land'
  type?: string
  key: string
}
export function IslandTradeDialog({
  open,
  name,
  art,
  quantity,
  setQuantity,
  price,
  gold,
  busy,
  retrying,
  error,
  selling,
  stockSale = false,
  maxQuantity = 100,
  onClose,
  onConfirm,
}: {
  open: boolean
  name: string
  art: ReactNode
  quantity: number
  setQuantity: (quantity: number) => void
  price: number
  gold: number
  busy: boolean
  retrying: boolean
  error: string
  selling: boolean
  stockSale?: boolean
  maxQuantity?: number
  onClose: () => void
  onConfirm: () => void
}) {
  const total = quantity * price
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose()
      }}
    >
      <DialogContent className="island-trade-dialog" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>
            {selling ? (stockSale ? '보관 물품 판매' : '구조물 판매') : '내 섬에 데려오기'}
          </DialogTitle>
          <DialogDescription>
            {stockSale
              ? '보관 중인 수량만 판매할 수 있어요. 개당 현재 구매가의 50%를 받아요.'
              : selling
                ? '판매한 구조물은 보유 목록에서 제외돼요.'
                : '구매한 물건은 보관함에 들어가요. 바로 배치할 수도 있어요.'}
          </DialogDescription>
        </DialogHeader>
        <div className="island-trade-art" aria-hidden="true">
          {art}
        </div>
        <h3>{name}</h3>
        {(!selling || stockSale) && (
          <div className="island-trade-quantity">
            <span>수량</span>
            <div>
              <button
                aria-label={`${selling ? '판매' : '구매'} 수량 줄이기`}
                disabled={busy || retrying || quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={15} />
              </button>
              <input
                aria-label={`${selling ? '판매' : '구매'} 수량`}
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                disabled={busy || retrying}
                onChange={(event) =>
                  setQuantity(
                    Math.max(1, Math.min(maxQuantity, Math.floor(Number(event.target.value)) || 1)),
                  )
                }
              />
              <button
                aria-label={`${selling ? '판매' : '구매'} 수량 늘리기`}
                disabled={busy || retrying || quantity >= maxQuantity}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        )}
        <div className="island-trade-price">
          <span>{selling ? '받는 골드' : '총 가격'}</span>
          <b>
            <GoldIcon className="size-5" />
            {total.toLocaleString('ko-KR')}
          </b>
        </div>
        {
          <p className="island-trade-balance">
            보유 {gold.toLocaleString('ko-KR')} · {selling ? '판매' : '구매'} 후{' '}
            {Math.max(0, gold + (selling ? total : -total)).toLocaleString('ko-KR')} 골드
          </p>
        }
        {error && (
          <p role="alert" className="island-trade-error">
            {error}
          </p>
        )}
        <button
          className="island-trade-confirm"
          disabled={busy || (!retrying && ((!selling && gold < total) || quantity > maxQuantity))}
          onClick={onConfirm}
        >
          {busy
            ? '결과 확인 중…'
            : retrying
              ? '같은 요청으로 결과 확인'
              : quantity > maxQuantity
                ? '보관 수량이 부족해요'
                : !selling && gold < total
                  ? '골드가 부족해요'
                  : selling
                    ? '판매하기'
                    : `${total.toLocaleString('ko-KR')} 골드로 구매`}
        </button>
      </DialogContent>
    </Dialog>
  )
}
export function IslandAcquiredDialog({
  item,
  art,
  onPlace,
  onClose,
}: {
  item: AcquiredIslandItem | null
  art: ReactNode
  onPlace: () => void
  onClose: () => void
}) {
  return (
    <Dialog
      open={!!item}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <DialogContent className="island-acquired-dialog">
        <DialogHeader>
          <span className="island-acquired-eyebrow">
            <Check size={13} />내 섬에 도착했어요
          </span>
          <DialogTitle>
            {item?.name}
            {(item?.quantity ?? 0) > 1 ? ` ×${item!.quantity}` : ''}
          </DialogTitle>
          <DialogDescription className="sr-only">
            구매가 완료되어 보관함에 추가했어요.
          </DialogDescription>
        </DialogHeader>
        <div className="island-acquired-art" key={item?.key} aria-hidden="true">
          <span className="island-acquired-halo" />
          {art}
          <i />
          <i />
          <i />
          <i />
        </div>
        <p className="island-acquired-cost">
          <GoldIcon className="size-5" />
          {item?.delta.toLocaleString('ko-KR')} 골드
        </p>
        <button className="island-trade-confirm" onClick={onPlace}>
          <MapPin size={17} />
          바로 배치
        </button>
        <button className="island-acquired-store" onClick={onClose}>
          <Package size={16} />
          보관함에 두기
        </button>
      </DialogContent>
    </Dialog>
  )
}
