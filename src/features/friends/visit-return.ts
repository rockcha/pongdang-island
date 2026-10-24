import { useLocation, useNavigationType } from 'react-router'
import { useRef, useState, useCallback } from 'react'

const entries = new Map<string, { top: number; tab: string; onlineOnly: boolean }>()

// Each history entry owns its state; a fresh navigation starts at the top.
export function useFriendListReturn(owner: string | undefined) {
  const location = useLocation()
  const navigation = useNavigationType()
  const key = `${owner}:${location.key}`
  const [initial] = useState(() => navigation === 'POP' ? entries.get(key) : undefined)
  const scroll = useRef<HTMLDivElement>(null)
  const restored = useRef(false)
  function restore(ready: boolean) {
    if (!ready || restored.current || !scroll.current) return
    scroll.current.scrollTop = initial?.top ?? 0
    restored.current = true
  }
  return { initial, scroll, restore, save: (tab: string, onlineOnly: boolean) => {
    entries.set(key, { top: scroll.current?.scrollTop ?? 0, tab, onlineOnly })
    if (entries.size > 30) entries.delete(entries.keys().next().value!)
  } }
}

const tankEntries = new Map<string, string>()
export function useReturningTank() {
  const location = useLocation()
  const navigation = useNavigationType()
  const [id] = useState(() => navigation === 'POP' ? tankEntries.get(location.key) ?? '' : '')
  const save = useCallback((tank: string) => {
    tankEntries.set(location.key, tank)
    if (tankEntries.size > 30) tankEntries.delete(tankEntries.keys().next().value!)
  }, [location.key])
  return { id, save }
}

const pickerEntries = new Map<string, { top: number; order: string[] }>()
export function useReturningPicker(owner: string | undefined) {
  const location = useLocation()
  const navigation = useNavigationType()
  const key = `${owner}:${location.key}`
  const [initial] = useState(() => navigation === 'POP' ? pickerEntries.get(key) : undefined)
  return { initial, save: (value: { top: number; order: string[] } | null) => {
    if (value) {
      pickerEntries.set(key, value)
      if (pickerEntries.size > 30) pickerEntries.delete(pickerEntries.keys().next().value!)
    }
    else pickerEntries.delete(key)
  } }
}
