import { LayoutGrid } from 'lucide-react'
import { CommonSpeciesIcon } from './collection-filter-icons'
import { regionIcons } from '@/features/regions/region-icons'

export function HabitatFilterIcon({ value }: { value: string }) {
  if (regionIcons[value]) return <img src={regionIcons[value].src} alt="" className="size-6 shrink-0 object-contain" />
  if (value === 'common') return <CommonSpeciesIcon />
  return <LayoutGrid aria-hidden="true" className="size-5 shrink-0 text-primary" />
}
