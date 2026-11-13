import fs from 'node:fs'
import sharp from 'sharp'
import { tower, crab, shrimp, snail, monster } from './tower-defense-shapes.mjs'
import { createHash } from 'node:crypto'
import {
  GRID,
  FIELD,
  ENTRANCES,
  SITES,
  TOWER_KINDS,
  MONSTER_KINDS,
} from '../src/features/arcade/tower-defense-engine.ts'
import { optimizePng } from './optimize-png-lossless.mjs'

const batch = 'assets/storage-upload/new/20261113-005653',
  root = 'arcade/tower-defense',
  files = []
for (const dir of [root, 'review']) fs.mkdirSync(`${batch}/${dir}`, { recursive: true })
fs.mkdirSync('public/' + root, { recursive: true })
const hash = (b) => createHash('sha256').update(b).digest('hex')
const wrap = (body, w = 128, h = 128) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`
const circle = (x, y, r, fill, stroke = '#506b62', sw = 4) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
const path = (d, fill, stroke = '#506b62', sw = 4) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`
const wall = () =>
  '<rect x="16" y="16" width="96" height="96" rx="13" fill="#dec4a9" stroke="#9f8d79" stroke-width="5"/>' +
  path('M21 63 H107 M64 21 V62 M43 65 V107 M86 65 V107', 'none', '#b19d85', 4)
function castle() {
  let towers = ''
  for (const x of [27, 101])
    for (const y of [27, 101])
      towers +=
        circle(x, y, 17, '#f4e6c7', '#a89d7b', 4) +
        circle(x, y, 12, '#8eb9a8', '#5d8c7d', 3) +
        circle(x, y, 3, '#ebd196', 'none', 0)
  return (
    '<rect x="19" y="19" width="90" height="90" rx="11" fill="#f3e8cb" stroke="#a89d7b" stroke-width="4"/>' +
    path('M53 18 H75 V27 H53 Z', '#849e86', '#7c927d', 2) +
    path('M64 32 L96 64 L64 96 L32 64 Z', '#a8cabb', '#5d8c7d', 4) +
    path('M64 33 V95 M33 64 H95', 'none', '#7fa997', 3) +
    circle(64, 64, 6, '#ead19c', '#bca365', 2.5) +
    towers
  )
}
function board() {
  let gates = ''
  for (const c of ENTRANCES) {
    const p = SITES[c]
    gates +=
      circle(p.x, p.y, 16, '#b9d0bf', '#8eac9a', 2) +
      circle(p.x, p.y, 10, '#6d9180', 'none', 0) +
      path(`M${p.x - 4} ${p.y - 3} L${p.x} ${p.y + 2} L${p.x + 4} ${p.y - 3}`, 'none', '#dce9cd', 2)
  }
  return `<defs><pattern id="tiles" x="${GRID.x}" y="${GRID.y}" width="72" height="72" patternUnits="userSpaceOnUse"><rect width="72" height="72" fill="#e4eddd"/><path d="M0 0 H36 V36 H0 Z M36 36 H72 V72 H36 Z" fill="#dce8d9"/><path d="M0 0 H72 V72 H0 Z M36 0 V72 M0 36 H72" fill="none" stroke="#a0bca4" stroke-opacity=".17" stroke-width=".7"/></pattern></defs><rect width="${FIELD.width}" height="${FIELD.height}" fill="#d5e7dd"/><rect x="12" y="22" width="${FIELD.width - 24}" height="${FIELD.height - 44}" rx="14" fill="#e4eddd"/><rect x="${GRID.x}" y="${GRID.y}" width="${GRID.columns * 36}" height="${GRID.rows * GRID.cell}" fill="url(#tiles)"/>${gates}`
}
function at(body, x, y, size) {
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 128})">${body}</g>`
}
async function save(name, svg, { raster = false, columns = 1, rows = 1 } = {}) {
  const svgPath = `${root}/${name}.svg`
  fs.writeFileSync('public/' + svgPath, svg)
  fs.writeFileSync(`${batch}/${svgPath}`, svg)
  const entry = {
    id: name,
    path: svgPath,
    type: 'svg',
    sha256: hash(svg),
    generator: 'repo-native SVG',
    columns,
    rows,
  }
  if (raster) {
    const png = optimizePng(
        await sharp(Buffer.from(svg))
          .resize(columns * 256, rows * 256)
          .png()
          .toBuffer(),
      ),
      pngPath = `${root}/${name}.png`
    fs.writeFileSync('public/' + pngPath, png)
    fs.writeFileSync(`${batch}/${pngPath}`, png)
    entry.sprite = {
      path: pngPath,
      sha256: hash(png),
      cell: 256,
      width: columns * 256,
      height: rows * 256,
    }
    await sharp(png).flatten({ background: '#e4eddd' }).png().toFile(`${batch}/review/${name}.png`)
  }
  files.push(entry)
}
for (const kind of TOWER_KINDS) {
  await save(`${kind}-v5`, wrap(tower(kind)))
  await save(
    `${kind}-v5-sprite`,
    wrap(
      Array.from(
        { length: 4 },
        (_, i) => `<g transform="translate(${i * 128} 0)">${tower(kind, i)}</g>`,
      ).join(''),
      512,
      128,
    ),
    { raster: true, columns: 4, rows: 1 },
  )
}
const kinds = MONSTER_KINDS
let enemies = ''
for (const [row, kind] of kinds.entries())
  for (let f = 0; f < 4; f++)
    enemies += `<g transform="translate(${f * 128} ${row * 128})">${monster(kind, f)}</g>`
await save('enemies-v5-sprite', wrap(enemies, 512, kinds.length * 128), {
  raster: true,
  columns: 4,
  rows: kinds.length,
})
await save('wall-v2', wrap(wall()))
await save('castle-v2', wrap(castle()))
await save('field-v4', wrap(board(), FIELD.width, FIELD.height))
let poster =
  '<rect width="576" height="432" fill="#d5e7dd"/><rect x="18" y="18" width="540" height="396" rx="25" fill="#e6eedc"/>'
poster += at(castle(), 288, 365, 85)
for (const y of [125, 450])
  poster += circle(y, 57, 24, '#b7d1be', '#8daa97', 3) + circle(y, 57, 15, '#6d9180', 'none', 0)
for (const [kind, x, y] of [
  ['swarm', 462, 102],
  ['shield', 425, 325],
  ['rusher', 370, 122],
  ['splitter', 310, 320],
  ['boss', 460, 215],
  ['abyss', 355, 220],
])
  poster += at(
    monster(kind, 0),
    70 + (y / 432) * 440,
    65 + (576 - x) * 0.95,
    kind === 'abyss' ? 90 : 58,
  )
poster +=
  at(tower('octopus'), 170, 280, 74) +
  at(tower('plasma'), 400, 280, 74) +
  at(tower('laser'), 288, 230, 74)
await save('thumbnail-v8', wrap(poster, 576, 432))
const manifest = {
  status: 'generated',
  generator: 'repo-native SVG with lossless PNG sprite export',
  reference:
    'User sketch: one round pink body, two dot eyes, one funnel nozzle. No mouths, upright faces or mounting plates. All seven towers and monsters use strict overhead silhouettes; new attack families have distinct colours and silhouettes.',
  animation:
    'Turrets hold frame 0 at rest and use frames 1-3 only while firing. No idle body, limb or nozzle movement.',
  files,
}
fs.writeFileSync(`${batch}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ batch, files: files.map((f) => f.path) }))
