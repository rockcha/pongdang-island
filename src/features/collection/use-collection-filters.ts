import { useEffect, useMemo, useState, type SetStateAction } from 'react'
import { create } from 'zustand'
import {
  readCollectionFilters,
  saveCollectionFilters,
  type CollectionFilters,
} from './filter-preference'

// UI preferences only. Balances, rewards and inventory belong to the query cache.
export const useCollectionFilterStore = create<{
  owners: Record<string, CollectionFilters>
  set: (owner: string, filters: CollectionFilters) => void
}>((set) => ({
  owners: {},
  set: (owner, filters) => set((state) => ({ owners: { ...state.owners, [owner]: filters } })),
}))

export function useCollectionFilters(owner?: string, initialRegion = 'all', initialTab?:CollectionFilters['tab']) {
  const initial = useMemo(() => ({...readCollectionFilters(owner, initialRegion),...(initialTab?{tab:initialTab}:{})}), [owner, initialRegion, initialTab])
  const [local, setLocal] = useState(initial)
  const stored = useCollectionFilterStore((state) => (owner ? state.owners[owner] : undefined))
  const filters = owner ? (stored ?? initial) : local
  const setFilters = (action: SetStateAction<CollectionFilters>) => {
    if (!owner) {
      setLocal(action)
      return
    }
    const previous = useCollectionFilterStore.getState().owners[owner] ?? initial
    const next = typeof action === 'function' ? action(previous) : action
    useCollectionFilterStore.getState().set(owner, next)
    saveCollectionFilters(owner, next)
  }
  useEffect(() => {
    if (owner && initialRegion !== 'all') {
      const previous = useCollectionFilterStore.getState().owners[owner] ?? initial
      const next = {
        ...previous,
        tab: 'all' as const,
        rarity: 'all' as const,
        status: 'all' as const,
        habitat: initialRegion,
        search: '',
        limited: 'all',
        effect: 'all',
      }
      useCollectionFilterStore.getState().set(owner, next)
      saveCollectionFilters(owner, next)
    }
  }, [owner, initialRegion, initial])
  return [filters, setFilters] as const
}
