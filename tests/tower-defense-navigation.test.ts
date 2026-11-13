// @vitest-environment node
import fs from 'node:fs'
import { expect, it } from 'vitest'
import {
  ENTRANCES,
  GRID,
  HOME,
  SITES,
  CELL_COUNT,
  createDefense,
  beginDefense,
  build,
  cellAt,
  startWave,
  spawnEnemy,
  stepDefense,
  refreshFlow,
} from '../src/features/arcade/tower-defense-engine'

function trace(seed: number, maze: boolean) {
  const s = createDefense(seed)
  beginDefense(s)
  s.gold = 10000
  s.lives = s.maxLives = 100
  if (maze)
    for (const [row, gap] of [
      [3, GRID.columns - 1],
      [6, 0],
      [9, GRID.columns - 1],
    ])
      for (let x = 0; x < GRID.columns; x++)
        if (x !== gap) expect(build(s, cellAt(x, row), 'wall')).toBe(true)
  startWave(s)
  s.spawned = s.plan.length
  refreshFlow(s)
  const shortest = s.flow[ENTRANCES[0]]
  for (let i = 0; i < 24; i++) spawnEnemy(s, 'crab', ENTRANCES[0])
  const enemies = [...s.enemies]
  const paths = enemies.map((e) => [e.cell])
  for (const e of enemies) e.speed = GRID.cell * 20
  for (let tick = 0; tick < 1000 && s.enemies.length; tick++) {
    stepDefense(s, 0.05)
    enemies.forEach((e, i) => {
      const previous = paths[i].at(-1)!
      if (e.cell === previous) return
      expect(s.flow[e.cell]).toBeLessThan(s.flow[previous])
      expect(s.blocked[e.cell]).toBe(0)
      const x0 = previous % GRID.columns,
        y0 = Math.floor(previous / GRID.columns)
      const x1 = e.cell % GRID.columns,
        y1 = Math.floor(e.cell / GRID.columns)
      expect(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))).toBe(1)
      if (x0 !== x1 && y0 !== y1) {
        expect(s.blocked[cellAt(x0, y1)]).toBe(0)
        expect(s.blocked[cellAt(x1, y0)]).toBe(0)
      }
      paths[i].push(e.cell)
    })
  }
  expect(s.enemies).toHaveLength(0)
  for (const path of paths) {
    expect(path.at(-1)).toBe(HOME)
    expect(new Set(path).size).toBe(path.length)
    expect(path.length).toBeLessThanOrEqual(CELL_COUNT)
  }
  return { paths, shortest }
}

it('places entrance markers on the leftmost and rightmost top cells', () => {
  expect(GRID.columns).toBe(11)
  expect(SITES[HOME].x).toBe((SITES[ENTRANCES[0]].x + SITES[ENTRANCES[1]].x) / 2)
  expect(ENTRANCES).toEqual([cellAt(0, 0), cellAt(GRID.columns - 1, 0)])
  const board = fs.readFileSync('public/arcade/tower-defense/field-v5.svg', 'utf8')
  for (const gate of ENTRANCES)
    expect(board).toContain(`cx="${SITES[gate].x}" cy="${SITES[gate].y}" r="16"`)
  expect(board.match(/r="16"/g)).toHaveLength(2)
})
it.each([false, true])(
  'varies routes without loops or blocked-corner shortcuts (maze %s)',
  (maze) => {
    const { paths, shortest } = trace(42, maze)
    expect(new Set(paths.map((p) => p.join(','))).size).toBeGreaterThan(1)
    const distances = paths.map((path) =>
      path.slice(1).reduce((sum, cell, index) => {
        const previous = path[index]
        return (
          sum +
          (cell % GRID.columns !== previous % GRID.columns &&
          Math.floor(cell / GRID.columns) !== Math.floor(previous / GRID.columns)
            ? Math.SQRT2
            : 1)
        )
      }, 0),
    )
    expect(Math.max(...distances)).toBeGreaterThan(shortest + 0.1)
    expect(paths).toEqual(trace(42, maze).paths)
    expect(paths).not.toEqual(trace(7, maze).paths)
  },
)
