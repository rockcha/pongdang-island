import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TankPanControls } from '@/features/aquarium/tank-pan-controls'
afterEach(cleanup)

it('accumulates small arrow movements while the camera slowly catches up', () => {
  const move=vi.fn()
  const ui=render(<TankPanControls view={.51} onMove={move}/>)
  expect(screen.queryByRole('slider')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'어항 오른쪽으로 조금 이동'}))
  expect(move).toHaveBeenLastCalledWith(.66)
  ui.rerender(<TankPanControls view={.52} onMove={move}/>)
  fireEvent.click(screen.getByRole('button',{name:'어항 오른쪽으로 조금 이동'}))
  expect(move.mock.lastCall?.[0]).toBeCloseTo(.81)
})
