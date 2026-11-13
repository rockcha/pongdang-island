import { FIELD, GRID, cellAt } from './tower-defense-engine'

/** One stroke visits each tile once and fills gaps between sparse pointer events. */
export class WallStroke {
  private last: number | null = null
  private visited = new Set<number>()
  active = false
  private paint: (cell: number) => void
  constructor(paint: (cell: number) => void) {
    this.paint = paint
  }
  start(cell: number | null) {
    this.end()
    this.active = true
    this.move(cell)
  }
  move(cell: number | null) {
    if (!this.active) return
    if (cell === null) {
      this.last = null
      return
    }
    const from = this.last ?? cell
    let x = from % GRID.columns,
      y = Math.floor(from / GRID.columns)
    const tx = cell % GRID.columns,
      ty = Math.floor(cell / GRID.columns)
    const dx = Math.abs(tx - x),
      dy = Math.abs(ty - y),
      sx = x < tx ? 1 : -1,
      sy = y < ty ? 1 : -1
    let error = dx - dy
    while (true) {
      const next = cellAt(x, y)
      if (!this.visited.has(next)) {
        this.visited.add(next)
        this.paint(next)
      }
      if (x === tx && y === ty) break
      const twice = error * 2
      if (twice > -dy) {
        error -= dy
        x += sx
      }
      if (twice < dx) {
        error += dx
        y += sy
      }
    }
    this.last = cell
  }
  end() {
    this.active = false
    this.last = null
    this.visited.clear()
  }
}

/** Canvas CSS bounds already include Phaser's fit/letterboxing; DPR is irrelevant here. */
export function placementCell(
  x: number,
  y: number,
  bounds: { left: number; top: number; width: number; height: number },
) {
  if (bounds.width <= 0 || bounds.height <= 0) return null
  const col = Math.floor((((x - bounds.left) / bounds.width) * FIELD.width - GRID.x) / GRID.cell)
  const row = Math.floor((((y - bounds.top) / bounds.height) * FIELD.height - GRID.y) / GRID.cell)
  return col >= 0 && col < GRID.columns && row >= 0 && row < GRID.rows ? cellAt(col, row) : null
}
