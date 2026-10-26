import { expect, it } from 'vitest'
import { landContours, landOutlinePath } from '@/features/my-island/terrain-outline'

it('merges touching edges into one rounded outline instead of disconnected tile borders', () => {
  const cells = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ]
  expect(landContours(cells)).toEqual([
    [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 1 },
    ],
  ])
  const path = landOutlinePath(cells)
  expect(path.match(/M/g)).toHaveLength(1)
  expect(path.match(/Q/g)).toHaveLength(4)
  expect(path.endsWith('Z')).toBe(true)
  expect(landOutlinePath([])).toBe('')
})
it('preserves holes and separate islands at diagonal contacts', () => {
  const ring = Array.from({ length: 9 }, (_, i) => ({ x: i % 3, y: Math.floor(i / 3) })).filter(
    (p) => p.x !== 1 || p.y !== 1,
  )
  expect(landContours(ring)).toHaveLength(2)
  expect(
    landContours([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]),
  ).toHaveLength(2)
  expect(landOutlinePath(ring)).not.toMatch(/NaN|undefined/)
})
it('traces every small terrain arrangement without losing land area or boundary segments', () => {
  for (let mask = 0; mask < 512; mask++) {
    const cells = Array.from({ length: 9 }, (_, i) => ({ x: i % 3, y: Math.floor(i / 3) })).filter(
      (_, i) => mask & (1 << i),
    )
    const loops = landContours(cells)
    const area = loops.reduce(
      (sum, loop) =>
        sum +
        loop.reduce((a, p, i) => {
          const q = loop[(i + 1) % loop.length]
          return a + p.x * q.y - q.x * p.y
        }, 0) /
          2,
      0,
    )
    expect(area, `terrain ${mask}`).toBe(cells.length)
    const perimeter = cells.reduce(
      (n, p) =>
        n +
        [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].filter(([x, y]) => !cells.some((q) => q.x === p.x + x && q.y === p.y + y)).length,
      0,
    )
    const length = loops.reduce(
      (n, loop) =>
        n +
        loop.reduce((a, p, i) => {
          const q = loop[(i + 1) % loop.length]
          return a + Math.hypot(q.x - p.x, q.y - p.y)
        }, 0),
      0,
    )
    expect(length, `terrain ${mask}`).toBe(perimeter)
  }
})
