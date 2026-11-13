import fs from 'node:fs'
import { ENTRANCES, SITES, FIELD, GRID } from '../src/features/arcade/tower-defense-engine.ts'

// Keep the existing board artwork and regenerate only its entrance markers.
const root = 'public/arcade/tower-defense'
const original = fs.readFileSync(`${root}/field-v4.svg`, 'utf8')
const firstGate = original.indexOf('<circle')
if (firstGate < 0) throw Error('Base board has no entrance markers')
const gates = ENTRANCES.map((cell) => {
  const { x, y } = SITES[cell]
  return `<circle cx="${x}" cy="${y}" r="16" fill="#b9d0bf" stroke="#8eac9a" stroke-width="2"/><circle cx="${x}" cy="${y}" r="10" fill="#6d9180"/><path d="M${x - 4} ${y - 3} L${x} ${y + 2} L${x + 4} ${y - 3}" fill="none" stroke="#dce9cd" stroke-width="2"/>`
}).join('')
const board = original.slice(0, firstGate)
  .replaceAll('468', String(FIELD.width))
  .replace('width="444"', `width="${FIELD.width - 24}"`)
  .replace('width="432"', `width="${GRID.columns * GRID.cell}"`)
fs.writeFileSync(`${root}/field-v5.svg`, board + gates + '</g></svg>\n')
