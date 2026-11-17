import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FarmMapObjects, type FarmMapActions } from '@/features/farm/farm-map-objects'
import { farmStatusTime } from '@/features/farm/farm-map-status'
import { initialFarmSimulation, CROP_FRESH_MS } from '@/features/farm/farm-simulation'
import { farmCrops } from '@/features/farm/crop-catalog'
const artwork = vi.hoisted(() => ({ render: vi.fn() }))
vi.mock('@/features/farm/topview-art', () => ({
  TopviewArt: (props: unknown) => {
    artwork.render(props)
    return <g data-testid="art" />
  },
}))
afterEach(() => {
  cleanup()
  artwork.render.mockReset()
})
it('redraws growing crop artwork only at growth-stage boundaries while click handlers use the latest mode', () => {
  const object = { id: 1, kind: 'plot' as const, x: 3, y: 4 },
    objects = [object],
    simulation = initialFarmSimulation(),
    researchJobs = {}
  const duration = farmCrops.wheat.growSeconds * 1000,
    readyAt = duration + 1000
  simulation.cropJobs[1] = { crop: 'wheat', readyAt }
  const first = vi.fn(),
    latest = vi.fn(),
    actions = createRef<FarmMapActions>()
  actions.current = { activate: first, hover: vi.fn(), collect: vi.fn(), claim: vi.fn() }
  const props = {
    objects,
    simulation,
    researchJobs,
    editing: false,
    mode: 'look',
    toolMenu: null,
    selected: null,
    actions,
  }
  const { rerender } = render(
    <svg>
      <FarmMapObjects {...props} clock={1000} />
    </svg>,
  )
  expect(artwork.render).toHaveBeenCalledTimes(1)
  rerender(
    <svg>
      <FarmMapObjects {...props} clock={1000 + duration * 0.2} />
    </svg>,
  )
  expect(artwork.render).toHaveBeenCalledTimes(1)
  actions.current = { ...actions.current, activate: latest }
  fireEvent.click(screen.getByRole('button', { name: /\(3,4\)/ }))
  expect(first).not.toHaveBeenCalled()
  expect(latest).toHaveBeenCalledWith(3, 4)
  rerender(
    <svg>
      <FarmMapObjects {...props} clock={1000 + duration * 0.5} />
    </svg>,
  )
  expect(artwork.render).toHaveBeenCalledTimes(2)
  expect(artwork.render.mock.lastCall?.[0]).toMatchObject({ stage: 'growing', progress: 0.5 })
  rerender(
    <svg>
      <FarmMapObjects {...props} clock={readyAt} />
    </svg>,
  )
  expect(artwork.render.mock.lastCall?.[0]).toMatchObject({ stage: 'ready', progress: 1 })
  rerender(
    <svg>
      <FarmMapObjects {...props} clock={readyAt + CROP_FRESH_MS} />
    </svg>,
  )
  expect(artwork.render.mock.lastCall?.[0]).toMatchObject({ stage: 'rotten' })
})
it('keeps static/completed status clocks stable while preserving active production, freshness warning and spoilage', () => {
  const object = { id: 1, kind: 'plot' as const, x: 3, y: 4 },
    simulation = initialFarmSimulation()
  expect(farmStatusTime(object, simulation, {}, 5000)).toBe(0)
  simulation.cropJobs[1] = { crop: 'wheat', readyAt: 10000 }
  expect(farmStatusTime(object, simulation, {}, 5000)).toBe(5000)
  expect(farmStatusTime(object, simulation, {}, 20000)).toBe(10000)
  const rottenAt = 10000 + CROP_FRESH_MS
  expect(farmStatusTime(object, simulation, {}, rottenAt - 15000)).toBe(rottenAt - 15000)
  expect(farmStatusTime(object, simulation, {}, rottenAt + 5000)).toBe(rottenAt)
  const animal = { ...object, kind: 'cow' as const }
  delete simulation.cropJobs[1]
  simulation.animalJobs[1] = 10000
  expect(farmStatusTime(animal, simulation, {}, 5000)).toBe(5000)
  expect(farmStatusTime(animal, simulation, {}, 20000)).toBe(10000)
})
