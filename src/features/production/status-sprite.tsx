import type { ProductionFacility } from './api'
import {Hourglass,Wind} from 'lucide-react'
import { productionStatus, remainingTime } from './production-status'
import './status-sprite.css'

export type ProductionStatus = ReturnType<typeof productionStatus>
export const productionLabels = {
  idle: '가동 대기',
  working: '생산 중',
  ready: '수령 대기',
  expired: '만료',
}

export const productionCardColors: Record<ProductionStatus, string> = {
  idle: 'border-[#e4ddd4] bg-white',
  working: 'border-[#e9c88f] bg-[#fff0d7]',
  ready: 'border-[#b7d5be] bg-[#e8f4eb]',
  expired:
    'border-[#9e9ea5] bg-[#b4b4b8] [&_h3]:text-zinc-900 [&_p]:text-zinc-700 [&_p:first-child]:text-zinc-900 [&_.border-t]:border-black/15',
}

export function ProductionStatusSprite({
  status,
  className = '',
}: {
  status: ProductionStatus
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-production-sprite={status}
      className={`production-status-sprite production-status-sprite--${status} ${className}`}
    >
      {status==='idle'&&<span className="production-sleep"><span>z</span><span>z</span><span>Z</span></span>}
      {status==='expired'&&<span className="production-expired-mark"><Hourglass className="production-expired-hourglass size-7"/><Wind className="production-expired-dust size-4"/></span>}
    </span>
  )
}

export function ProductionProgress({ site, now }: { site: ProductionFacility; now: number }) {
  const started = Date.parse(site.startedAt!)
  const duration = Date.parse(site.completesAt!) - started
  const progress = Math.min(100, Math.max(0, ((now - started) / Math.max(1, duration)) * 100))
  return (
    <div
      role="progressbar"
      aria-label={`${site.name} 생산 진행률`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(progress)}
      aria-valuetext={`${Math.floor(progress)}% 완료 · ${remainingTime(site.completesAt!, now)} 남음`}
      className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25 ring-1 ring-inset ring-white/15"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 shadow-[0_0_10px_rgba(251,191,36,0.45)] transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export function StatusCircle({ site, now }: { site: ProductionFacility; now: number }) {
  const status = productionStatus(site, now)
  return (
    <span
      aria-hidden="true"
      className={`absolute right-2 top-2 grid size-12 place-items-center rounded-full border border-current/20 bg-background/95 shadow-sm ${status === 'working' ? 'text-amber-500' : status === 'ready' ? 'text-emerald-500' : status === 'expired' ? 'text-zinc-600' : 'text-muted-foreground/35'}`}
    >
      <ProductionStatusSprite status={status} />
    </span>
  )
}
