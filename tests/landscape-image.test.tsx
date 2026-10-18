import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { LandscapeImage } from '@/components/landscape-image'

afterEach(cleanup)
it('loads each landscape independently and offers recovery after an image error', () => {
  const view = render(<LandscapeImage src="/first.png" alt="풍경"/>)
  expect(screen.getByRole('status')).toBeTruthy()
  fireEvent.load(screen.getByRole('img'))
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.getByRole('img').className).toContain('opacity-100')
  view.rerender(<LandscapeImage src="/next.png" alt="다음 풍경"/>)
  expect(screen.getByRole('status')).toBeTruthy()
  fireEvent.error(screen.getByRole('img'))
  fireEvent.click(screen.getByRole('button',{name:'이미지 다시 시도'}))
  expect(screen.getByRole('status')).toBeTruthy()
  fireEvent.load(screen.getByRole('img'))
  expect(screen.queryByRole('status')).toBeNull()
})
