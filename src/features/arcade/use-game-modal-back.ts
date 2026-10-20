import { useEffect, useRef } from 'react'

/** Give the open game its own history entry so browser back returns to its menu. */
export function useGameModalBack(active: boolean, onBack: () => void, blocked = false) {
  const block = useRef(blocked)
  useEffect(() => {
    block.current = blocked
  }, [blocked])
  const callback = useRef(onBack)
  useEffect(() => {
    callback.current = onBack
  }, [onBack])
  const entry = useRef<string | null>(null)
  useEffect(() => {
    if (!active) return
    const token = crypto.randomUUID()
    entry.current = token
    window.history.pushState({ ...window.history.state, brickGameModal: token }, '')
    const back = () => {
      if (window.history.state?.brickGameModal !== token) {
        if (block.current)
          window.history.pushState({ ...window.history.state, brickGameModal: token }, '')
        callback.current()
      }
    }
    window.addEventListener('popstate', back)
    return () => {
      window.removeEventListener('popstate', back)
      entry.current = null
      if (window.history.state?.brickGameModal === token) window.history.back()
    }
  }, [active])
  return () => {
    if (entry.current && window.history.state?.brickGameModal === entry.current)
      window.history.back()
    else callback.current()
  }
}
