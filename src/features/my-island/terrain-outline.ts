import type { Cell } from './island-model'

type Edge = { from: Cell; to: Cell; direction: number }
const key = (p: Cell) => `${p.x},${p.y}`

/** Trace continuous coastlines, including holes and islands that only touch at a corner. */
export function landContours(cells: Cell[]): Cell[][] {
  const unique = new Map(cells.map((p) => [key(p), p]))
  const edges: Edge[] = []
  for (const { x, y } of [...unique.values()].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (!unique.has(`${x},${y - 1}`))
      edges.push({ from: { x, y }, to: { x: x + 1, y }, direction: 0 })
    if (!unique.has(`${x + 1},${y}`))
      edges.push({ from: { x: x + 1, y }, to: { x: x + 1, y: y + 1 }, direction: 1 })
    if (!unique.has(`${x},${y + 1}`))
      edges.push({ from: { x: x + 1, y: y + 1 }, to: { x, y: y + 1 }, direction: 2 })
    if (!unique.has(`${x - 1},${y}`))
      edges.push({ from: { x, y: y + 1 }, to: { x, y }, direction: 3 })
  }
  const outgoing = new Map<string, Edge[]>()
  for (const edge of edges)
    outgoing.set(key(edge.from), [...(outgoing.get(key(edge.from)) ?? []), edge])
  const visited = new Set<Edge>(),
    contours: Cell[][] = []
  for (const start of edges) {
    if (visited.has(start)) continue
    const loop: Cell[] = []
    let edge = start
    while (!visited.has(edge)) {
      visited.add(edge)
      loop.push(edge.from)
      if (key(edge.to) === key(start.from)) break
      const candidates = outgoing.get(key(edge.to)) ?? []
      // Follow the land on the right at diagonal junctions instead of crossing contours.
      const next = [1, 0, 3, 2]
        .map((turn) =>
          candidates.find((e) => !visited.has(e) && e.direction === (edge.direction + turn) % 4),
        )
        .find(Boolean)
      if (!next) throw new Error('Unclosed island coastline')
      edge = next
    }
    contours.push(
      loop.filter((p, i) => {
        const a = loop[(i + loop.length - 1) % loop.length],
          b = loop[(i + 1) % loop.length]
        return (p.x - a.x) * (b.y - p.y) !== (p.y - a.y) * (b.x - p.x)
      }),
    )
  }
  return contours
}

export function landOutlinePath(cells: Cell[], radius = 4): string {
  return landContours(cells)
    .map((loop) => {
      const corners = loop.map((p, i) => {
        const a = loop[(i + loop.length - 1) % loop.length],
          b = loop[(i + 1) % loop.length]
        const x = p.x * 32,
          y = p.y * 32
        const beforeLength = Math.hypot(a.x - p.x, a.y - p.y) * 32,
          afterLength = Math.hypot(b.x - p.x, b.y - p.y) * 32
        const r = Math.max(0, Math.min(radius, beforeLength / 2, afterLength / 2))
        return {
          x,
          y,
          before: {
            x: x + (((a.x - p.x) * 32) / beforeLength) * r,
            y: y + (((a.y - p.y) * 32) / beforeLength) * r,
          },
          after: {
            x: x + (((b.x - p.x) * 32) / afterLength) * r,
            y: y + (((b.y - p.y) * 32) / afterLength) * r,
          },
        }
      })
      return (
        `M${corners[0].after.x} ${corners[0].after.y} ` +
        [...corners.slice(1), corners[0]]
          .map((p) => `L${p.before.x} ${p.before.y}Q${p.x} ${p.y} ${p.after.x} ${p.after.y}`)
          .join(' ') +
        'Z'
      )
    })
    .join(' ')
}
