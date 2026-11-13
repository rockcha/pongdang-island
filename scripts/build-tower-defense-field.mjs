import fs from 'node:fs'
import { ENTRANCES, SITES } from '../src/features/arcade/tower-defense-engine.ts'

// Keep the existing board artwork and regenerate only its entrance markers.
const root = 'public/arcade/tower-defense'
const original = fs.readFileSync(`${root}/field-v4.svg`, 'utf8')
const firstGate = original.indexOf('<circle')
if (firstGate < 0) throw Error('Base board has no entrance markers')
const gates = ENTRANCES.map((cell) => {
  const { x, y } = SITES[cell]
  return `<circle cx="${x}" cy="${y}" r="16" fill="#b9d0bf" stroke="#8eac9a" stroke-width="2"/><circle cx="${x}" cy="${y}" r="10" fill="#6d9180"/><path d="M${x - 4} ${y - 3} L${x} ${y + 2} L${x + 4} ${y - 3}" fill="none" stroke="#dce9cd" stroke-width="2"/>`
}).join('')
fs.writeFileSync(`${root}/field-v5.svg`, original.slice(0, firstGate) + gates + '</g></svg>\n')
