import type { ContentSource } from './new-content'

export const contentSeenKey = (owner: string, source: ContentSource) =>
  'pongdang:content-seen:' + owner + ':' + source
export const contentSeenEvent = 'content-seen-changed'

export function contentSeenAt(owner: string, source: ContentSource) {
  try { return Number(localStorage.getItem(contentSeenKey(owner, source))) || 0 }
  catch { return 0 }
}

/** Acknowledge server timestamps actually returned to this account, never device time. */
export function markContentSeen(owner: string, source: ContentSource, timestamps: (string | null | undefined)[]) {
  if (!owner) return
  const newest = timestamps.reduce((latest, value) => Math.max(latest, Date.parse(value ?? '') || 0), 0)
  if (newest <= contentSeenAt(owner, source)) return
  try { localStorage.setItem(contentSeenKey(owner, source), String(newest)) }
  catch { return }
  window.dispatchEvent(new CustomEvent(contentSeenEvent, { detail: { owner, source } }))
}
