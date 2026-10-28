import { useSyncExternalStore } from 'react'
// One presentation clock for every mounted subscriber; no network requests.
const listeners = new Set<() => void>()
let value = Date.now(),
  timer: ReturnType<typeof setInterval> | undefined
const refresh = () => {
  value = Date.now()
  for (const listener of listeners) listener()
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    refresh()
    timer = setInterval(refresh, 1000)
    document.addEventListener('visibilitychange', refresh)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      clearInterval(timer)
      timer = undefined
      document.removeEventListener('visibilitychange', refresh)
    }
  }
}
export const useAppClock = () =>
  useSyncExternalStore(
    subscribe,
    () => value,
    () => 0,
  )
