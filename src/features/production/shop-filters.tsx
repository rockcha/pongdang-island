import { Search } from 'lucide-react'
import type { ProductionFacility } from './api'

export const shopSortOptions = [
  { key: 'output_count', label: '생산량 많은 순', direction: -1 },
  { key: 'input_count', label: '소모량 적은 순', direction: 1 },
  { key: 'production_minutes', label: '시간 짧은 순', direction: 1 },
  { key: 'storage_minutes', label: '보관 기간 긴 순', direction: -1 },
  { key: 'price', label: '가격 싼 순', direction: 1 },
] as const

type Metric = (typeof shopSortOptions)[number]['key']
export type ShopFilters = { search: string; sort: Metric }
export const initialShopFilters: ShopFilters = { search: '', sort: 'price' }

export function filterProductionShop(sites: ProductionFacility[], filter: ShopFilters) {
  const search = filter.search.trim().toLocaleLowerCase()
  const direction = shopSortOptions.find((option) => option.key === filter.sort)!.direction
  return sites
    .filter((site) => site.name.toLocaleLowerCase().includes(search))
    .sort((a, b) => (a[filter.sort] - b[filter.sort]) * direction || a.id.localeCompare(b.id))
}

export function ProductionShopFilters({
  value,
  onChange,
}: {
  value: ShopFilters
  onChange: (value: ShopFilters) => void
}) {
  return (
    <div className="mt-2 flex gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/70 bg-card px-3">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          aria-label="생산소 이름 검색"
          type="search"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="생산소 이름 검색"
          className="h-10 min-w-0 flex-1 bg-transparent text-xs outline-none"
        />
      </div>
      <select
        aria-label="생산소 정렬"
        value={value.sort}
        onChange={(e) => onChange({ ...value, sort: e.target.value as Metric })}
        className="min-h-10 w-32 shrink-0 rounded-xl border border-border/70 bg-card px-2 text-[11px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {shopSortOptions.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
