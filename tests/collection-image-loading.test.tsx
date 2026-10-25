import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import thumbnailAssets from '@/features/collection/thumbnail-assets.json'

vi.mock('@/features/collection/api', () => ({ collectibleUrl: (path: string) => '/'+path }))
afterEach(()=>{cleanup();vi.useRealTimers()})

it('reveals each image after loading and hides the old image while a new path loads', () => {
  const view = render(<CollectibleThumbnail path="first.png" name="물고기" fadeIn />)
  expect(screen.getByRole('img').className).toContain('opacity-0')
  fireEvent.load(screen.getByRole('img'))
  expect(screen.getByRole('img').className).toContain('opacity-100')
  view.rerender(<CollectibleThumbnail path="second.png" name="물고기" fadeIn />)
  expect(screen.getByRole('img').className).toContain('opacity-0')
  vi.useFakeTimers()
  fireEvent.error(screen.getByRole('img'))
  act(()=>vi.advanceTimersByTime(800))
  expect(screen.getByRole('img').getAttribute('src')).toBe('/second.png?retry=1')
  fireEvent.error(screen.getByRole('img'))
  expect(screen.getByRole('img',{name:'물고기 이미지 없음'})).toBeTruthy()
  expect(view.container.querySelector('[aria-busy="true"]')).toBeNull()
})


it('keeps successful images visible after reopening and uses lazy async decoding',()=>{
 const view=render(<CollectibleThumbnail path="cached.png" name="cached" loading="lazy"/>)
 expect(screen.getByRole('img').getAttribute('loading')).toBe('lazy')
 expect(screen.getByRole('img').getAttribute('decoding')).toBe('async')
 fireEvent.load(screen.getByRole('img'))
 view.unmount()
 const next=render(<CollectibleThumbnail path="cached.png" name="cached"/>)
 expect(screen.getByRole('img').className).toContain('opacity-100')
 expect(next.container.querySelector('[aria-busy="true"]')).toBeNull()
})

it('cancels a failed image retry when the path changes',()=>{
 vi.useFakeTimers()
 const view=render(<CollectibleThumbnail path="bad.png" name="fish"/>)
 fireEvent.error(screen.getByRole('img'))
 view.rerender(<CollectibleThumbnail path="new.png" name="fish"/>)
 act(()=>vi.advanceTimersByTime(800))
 expect(screen.getByRole('img').getAttribute('src')).toBe('/new.png')
 fireEvent.load(screen.getByRole('img'))
 expect(screen.getByRole('img').className).toContain('opacity-100')
})
it('uses a lightweight derivative, falls back to its original on failure and keeps large previews separate',()=>{
 const [path,asset]=Object.entries(thumbnailAssets)[0]
 const view=render(<CollectibleThumbnail path={path} name="optimized fish"/>)
 expect(screen.getByRole('img').getAttribute('src')).toBe(asset.small)
 fireEvent.error(screen.getByRole('img'))
 expect(screen.getByRole('img').getAttribute('src')).toBe('/'+path)
 fireEvent.load(screen.getByRole('img'))
 view.rerender(<CollectibleThumbnail path={path} name="optimized fish" resolution="large"/>)
 expect(screen.getByRole('img').getAttribute('src')).toBe(asset.large)
})
