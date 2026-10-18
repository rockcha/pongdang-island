import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'

vi.mock('@/features/collection/api', () => ({ collectibleUrl: (path: string) => '/'+path }))
afterEach(cleanup)

it('reveals each image after loading and hides the old image while a new path loads', () => {
  const view = render(<CollectibleThumbnail path="first.png" name="물고기" fadeIn />)
  expect(screen.getByRole('img').className).toContain('opacity-0')
  fireEvent.load(screen.getByRole('img'))
  expect(screen.getByRole('img').className).toContain('opacity-100')
  view.rerender(<CollectibleThumbnail path="second.png" name="물고기" fadeIn />)
  expect(screen.getByRole('img').className).toContain('opacity-0')
  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByText('준비 중')).toBeTruthy()
  expect(view.container.querySelector('[aria-busy="true"]')).toBeNull()
})
