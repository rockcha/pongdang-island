import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PetSprite } from '@/features/pets/pet-sprite'
const images = vi.hoisted(() => ({
  ready: new Map<string, HTMLImageElement>(),
  pending: new Map<string, (image: HTMLImageElement) => void>(),
}))
vi.mock('@/features/pets/pet-sprite-images', () => ({
  readyPetImage: (url: string) => images.ready.get(url),
  loadPetImage: (url: string) =>
    new Promise<HTMLImageElement>((resolve) =>
      images.pending.set(url, (image) => {
        images.ready.set(url, image)
        resolve(image)
      }),
    ),
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
  images.ready.clear()
  images.pending.clear()
})
it('preserves the canvas and previous frame while decoding, then paints cached transitions synchronously', async () => {
  vi.useFakeTimers()
  const clear = vi.fn(),
    draw = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: clear,
    drawImage: draw,
  } as unknown as CanvasRenderingContext2D)
  const view = render(<PetSprite speciesId="wave-cat" clip="idleA" label="대기" />),
    canvas = view.container.querySelector('canvas')
  const idle = '/pets/wave-cat_idle8_v2_sprite.png',
    happy = '/pets/wave-cat_happy8_v1_sprite.png'
  await act(async () => {
    images.pending.get(idle)!({ width: 1848, height: 924 } as HTMLImageElement)
  })
  expect(draw).toHaveBeenCalledTimes(1)
  view.rerender(<PetSprite speciesId="wave-cat" clip="happy" label="만족" />)
  expect(view.container.querySelector('canvas')).toBe(canvas)
  expect(clear).toHaveBeenCalledTimes(1)
  await act(async () => {
    images.pending.get(happy)!({ width: 1920, height: 960 } as HTMLImageElement)
  })
  expect(draw).toHaveBeenCalledTimes(2)
  view.rerender(<PetSprite speciesId="wave-cat" clip="idleA" label="대기" />)
  expect(view.container.querySelector('canvas')).toBe(canvas)
  expect(draw).toHaveBeenCalledTimes(3)
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})
