import { Select } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { regionIcons } from '@/features/regions/region-icons'
import { HabitatFilterIcon } from './habitat-filter-icon'
import type { Species } from '@/features/collection/api'

export function matchesRegionConcept(species: Pick<Species, 'native_region_id'>, concept: string) {
  return (
    concept === 'all' ||
    (concept === 'common' ? species.native_region_id == null : species.native_region_id === concept)
  )
}

const options = [
  { value: 'all', label: '전체 서식지' },
  { value: 'common', label: '공통 개체' },
  ...Object.entries(regionIcons).map(([value, meta]) => ({ value, label: meta.name })),
]
export function RegionConceptSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select.Root
      value={value}
      items={options}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onChange(next)
      }}
    >
      <Select.Trigger
        aria-label="서식지 선택"
        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <Select.Value className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <HabitatFilterIcon value={value} />
            <span className="truncate">
              {options.find((option) => option.value === value)?.label ?? '전체 서식지'}
            </span>
          </span>
        </Select.Value>
        <Select.Icon>
          <ChevronDown className="size-4 shrink-0 text-primary" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={5} collisionPadding={12} className="z-[70]">
          <Select.Popup className="max-h-[min(24rem,60dvh)] min-w-48 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-foreground shadow-lg outline-none">
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-xs outline-none data-highlighted:bg-secondary data-selected:text-primary"
                >
                  <Select.ItemText className="flex items-center gap-2">
                    <HabitatFilterIcon value={option.value} />
                    {option.label}
                  </Select.ItemText>
                  <Select.ItemIndicator>
                    <Check className="size-4" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
