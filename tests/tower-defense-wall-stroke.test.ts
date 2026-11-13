// @vitest-environment node
import { expect, it } from 'vitest'
import {
  BuildStroke,
  WallStroke,
  wallConnections,
} from '../src/features/arcade/tower-defense-placement'
import {
  createDefense,
  beginDefense,
  build,
  cellAt,
  GRID,
  HOME,
  ENTRANCES,
  routeCells,
} from '../src/features/arcade/tower-defense-engine'

it('fills every crossed horizontal cell even when only the end pointer event arrives', () => {
  const painted: number[] = [],
    stroke = new WallStroke((c) => painted.push(c))
  stroke.start(cellAt(1, 4))
  stroke.move(cellAt(6, 4))
  stroke.move(cellAt(2, 4))
  stroke.move(cellAt(6, 4))
  expect(painted).toEqual([1, 2, 3, 4, 5, 6].map((x) => cellAt(x, 4)))
})
it('supports vertical and diagonal strokes in reverse without gaps', () => {
  const painted: number[] = [],
    stroke = new WallStroke((c) => painted.push(c))
  stroke.start(cellAt(5, 8))
  stroke.move(cellAt(5, 5))
  stroke.move(cellAt(2, 2))
  expect(painted).toEqual(
    [
      [5, 8],
      [5, 7],
      [5, 6],
      [5, 5],
      [4, 4],
      [3, 3],
      [2, 2],
    ].map(([x, y]) => cellAt(x, y)),
  )
})
it('does not bridge outside-board movement and never paints after a cancelled stroke', () => {
  const painted: number[] = [],
    stroke = new WallStroke((c) => painted.push(c))
  stroke.start(cellAt(1, 1))
  stroke.move(null)
  stroke.move(cellAt(8, 8))
  stroke.end()
  stroke.move(cellAt(9, 9))
  expect(painted).toEqual([cellAt(1, 1), cellAt(8, 8)])
  stroke.start(cellAt(1, 1))
  expect(painted).toHaveLength(3)
})
it('uses real placement validation so the final closing wall and duplicate purchases are rejected', () => {
  const s = createDefense()
  beginDefense(s)
  s.gold = 1000
  const stroke = new WallStroke((c) => {
    build(s, c, 'wall')
  })
  stroke.start(cellAt(0, 7))
  stroke.move(cellAt(GRID.columns - 1, 7))
  stroke.move(cellAt(0, 7))
  stroke.end()
  expect(s.buildings).toHaveLength(GRID.columns - 1)
  expect(s.gold).toBe(1000 - (GRID.columns - 1) * 8)
  for (const gate of ENTRANCES) expect(routeCells(s, gate).at(-1)).toBe(HOME)
})
it('stops spending once funds run out even when the finger continues across new cells', () => {
  const s = createDefense()
  beginDefense(s)
  s.gold = 17
  const stroke = new WallStroke((c) => {
    build(s, c, 'wall')
  })
  stroke.start(cellAt(1, 4))
  stroke.move(cellAt(6, 4))
  expect(s.buildings).toHaveLength(2)
  expect(s.gold).toBe(1)
})
it('places towers continuously, skips duplicate cells, and stops charging when funds run out', () => {
  const s = createDefense()
  beginDefense(s)
  s.gold = 185
  const stroke = new BuildStroke((c) => {
    build(s, c, 'octopus')
  })
  stroke.start(cellAt(1, 8))
  stroke.move(cellAt(5, 8))
  stroke.move(cellAt(1, 8))
  stroke.end()
  expect(s.buildings.map((b) => b.cell)).toEqual([cellAt(1, 8), cellAt(2, 8)])
  expect(s.gold).toBe(5)
})
it('connects orthogonal wall junctions once, excludes towers and diagonals, and does not wrap rows', () => {
  const cells = [
    [3, 3],
    [2, 3],
    [4, 3],
    [3, 2],
    [3, 4],
    [11, 5],
    [0, 6],
  ]
  const buildings = cells.map(([x, y]) => ({ cell: cellAt(x, y), kind: 'wall' as const }))
  const links = wallConnections([...buildings, { cell: cellAt(4, 4), kind: 'octopus' }])
  expect(links).toHaveLength(4)
  expect(new Set(links.map(([a, b]) => [a, b].sort((a, b) => a - b).join(','))).size).toBe(4)
  expect(links.every(([a, b]) => a === cellAt(3, 3) || b === cellAt(3, 3))).toBe(true)
  expect(wallConnections(buildings.filter((b) => b.cell !== cellAt(3, 3)))).toEqual([])
})
