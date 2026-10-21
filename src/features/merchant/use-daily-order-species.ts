import { useEffect, useState } from 'react'
import { loadMerchant, type MerchantState } from './api'

export function useDailyOrderSpecies(open: boolean) {
  const [state, setState] = useState<MerchantState | null>(null)
  useEffect(() => {
    if (!open) return
    let active = true
    let version = 0
    setState(null)
    const refresh = () => {
      if (document.hidden) return
      const request = ++version
      void loadMerchant().then((next) => {
        if (active && request === version) setState(next)
      }).catch(() => {
        if (active && request === version) setState(null)
      })
    }
    refresh()
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('collectibles-changed', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('collectibles-changed', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [open])
  return new Set(state?.orders.filter((order) => !order.completed)
    .flatMap((order) => order.items.map((item) => item.speciesId)) ?? [])
}
