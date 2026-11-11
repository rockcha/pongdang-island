import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PetSprite } from '@/features/pets/pet-sprite'
import { createPetBlinkSchedule } from '@/features/pets/pet-idle-animation'
import { petNeedsFrame } from '@/features/pets/pet-needs-animation'
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
it.each(['hungry','lonely'] as const)('overlays only two eyes while retaining the %s body pose', clip=>{
  vi.useFakeTimers()
  vi.spyOn(Math,'random').mockReturnValue(0)
  const draw=vi.fn(),ellipse=vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({clearRect:vi.fn(),drawImage:draw,save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),ellipse,clip:vi.fn()} as unknown as CanvasRenderingContext2D)
  const main={width:1848,height:924} as HTMLImageElement,blink={width:1848,height:924} as HTMLImageElement
  images.ready.set('/pets/wave-cat_needs8_v1_sprite.png',main)
  images.ready.set('/pets/wave-cat_needs_blink8_v1_sprite.png',blink)
  const schedule=createPetBlinkSchedule(0)
  const at=schedule.starts.find(t=>t>0 && petNeedsFrame(t,'wave-cat',clip)%4===0)!
  render(<PetSprite speciesId="wave-cat" clip={clip} label="상태 대기"/> )
  act(()=>vi.advanceTimersByTime(at+150))
  const patches=draw.mock.calls.filter(args=>args[0]===blink)
  expect(draw.mock.calls.some(args=>args[0]===main)).toBe(true)
  expect(patches.length).toBeGreaterThanOrEqual(2)
  expect(patches.every(args=>args[3]<70 && args[4]<70)).toBe(true)
  expect(ellipse).toHaveBeenCalled()
})
it('preserves the canvas and previous frame while decoding, then paints cached transitions synchronously', async () => {
  vi.useFakeTimers()
  const clear = vi.fn(),
    draw = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: clear,
    drawImage: draw,
    save: vi.fn(),
    restore: vi.fn(),
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
it.each(['sand-golem', 'wave-cat', 'mochi-dragon', 'jelly-seal'] as const)('holds the lonely pose for %s and never tilts the whole body', speciesId => {
  vi.useFakeTimers()
  const rotate = vi.fn(), draw = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(), drawImage: draw, save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate,
  } as unknown as CanvasRenderingContext2D)
  images.ready.set(`/pets/${speciesId}_needs8_v1_sprite.png`, {width:1848,height:924} as HTMLImageElement)
  render(<PetSprite speciesId={speciesId} clip="lonely" label="애정 부족" />)
  act(() => vi.advanceTimersByTime(1000))
  expect(draw).toHaveBeenCalledTimes(1)
  expect(draw.mock.calls[0][2]).toBe(462)
  expect(rotate).not.toHaveBeenCalled()
})
