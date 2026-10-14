import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TestFishPicker } from '../src/features/aquarium/test-fish-picker'

vi.mock('@/features/collection/api', () => ({ loadCollection: vi.fn(async () => ({ catalog: [
  { id: 'anchovy', kind: 'fish', name: '은빛 멸치' },
  { id: 'grouper', kind: 'fish', name: '얼룩 왕그루퍼' },
  { id: 'map', kind: 'map', name: '지도' },
] })) }))
afterEach(cleanup)
it('adds the chosen species repeatedly to the selected tank as distinct temporary individuals', async () => {
  const onAdd = vi.fn(), onClear = vi.fn()
  render(<TestFishPicker tankId="tank-2" count={2} onAdd={onAdd} onClear={onClear}/> )
  await screen.findByRole('option', { name: '얼룩 왕그루퍼' })
  expect(screen.queryByRole('option', { name: '지도' })).toBeNull()
  fireEvent.change(screen.getByLabelText('테스트 어종'), { target: { value: 'grouper' } })
  fireEvent.click(screen.getByRole('button', { name: '넣기' }))
  fireEvent.click(screen.getByRole('button', { name: '넣기' }))
  expect(onAdd).toHaveBeenCalledTimes(2)
  expect(onAdd.mock.calls[0][0]).toMatchObject({ species_id: 'grouper', tank_id: 'tank-2' })
  expect(onAdd.mock.calls[0][0].id).not.toBe(onAdd.mock.calls[1][0].id)
  fireEvent.click(screen.getByRole('button', { name: '테스트 개체 비우기' }))
  expect(onClear).toHaveBeenCalledOnce()
})
