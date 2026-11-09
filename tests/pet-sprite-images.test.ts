import { afterEach, expect, it, vi } from 'vitest'
import { loadPetImage, readyPetImage } from '@/features/pets/pet-sprite-images'
afterEach(() => vi.unstubAllGlobals())
it('shares the decoded image between preloading and rendering and waits for decoding', async () => {
  let finishDecode!: () => void
  const decode = new Promise<void>((resolve) => {
    finishDecode = resolve
  })
  const created: FakeImage[] = []
  class FakeImage {
    src = ''
    onload: null | (() => Promise<void>) = null
    onerror: null | (() => void) = null
    decode = vi.fn(() => decode)
    constructor() {
      created.push(this)
    }
  }
  vi.stubGlobal('Image', FakeImage)
  const url = '/pets/test-shared-decode.png',
    first = loadPetImage(url),
    second = loadPetImage(url)
  expect(first).toBe(second)
  expect(created).toHaveLength(1)
  const onload = created[0].onload!()
  await Promise.resolve()
  expect(readyPetImage(url)).toBeUndefined()
  finishDecode()
  await onload
  expect(await first).toBe(created[0])
  expect(readyPetImage(url)).toBe(created[0])
  expect(loadPetImage(url)).toBe(first)
  expect(created[0].decode).toHaveBeenCalledTimes(1)
})
