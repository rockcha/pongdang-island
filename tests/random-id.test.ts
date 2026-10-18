import { afterEach, expect, it, vi } from 'vitest'
import { randomId } from '@/lib/random-id'

afterEach(() => vi.unstubAllGlobals())
it('generates distinct version 4 IDs when LAN HTTP does not expose randomUUID', () => {
  const source = globalThis.crypto
  vi.stubGlobal('crypto', {getRandomValues: source.getRandomValues.bind(source)})
  const ids = Array.from({length:100}, randomId)
  expect(new Set(ids).size).toBe(100)
  for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})
