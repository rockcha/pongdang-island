import fs from 'node:fs'
import sharp from 'sharp'
import { batch } from './prepare-pet-preview-assets.mjs'
const grids = JSON.parse(fs.readFileSync(`${batch}/source-grids.json`, 'utf8'))
// Visually reviewed head/nose patches exclude moving appendages. Larger facial
// patches constrain featureless materials; expression differences remain in RMSE.
const patches = {
  'sand-golem-idle': [160, 150, 145, 95],
  'sand-golem-hungry': [245, 235, 190, 110],
  'sand-golem-happy': [160, 150, 140, 90],
  'wave-cat-idle': [205, 150, 130, 105],
  'wave-cat-hungry': [280, 210, 180, 140],
  'wave-cat-happy': [263, 192, 29, 23],
  'mochi-dragon-idle': [171, 187, 43, 22],
  'mochi-dragon-hungry': [200, 185, 200, 150],
  'mochi-dragon-happy': [194, 196, 35, 18],
  'jelly-seal-idle': [150, 155, 105, 85],
  'jelly-seal-hungry': [225, 210, 150, 120],
  'jelly-seal-happy': [155, 150, 105, 85],
}
fs.mkdirSync(`${batch}/review`, { recursive: true })
const entries = []
for (const g of grids) {
  const patch = patches[g.id]
  if (!patch) continue
  const [x, y, w, h] = patch
  const svg = Buffer.from(
    `<svg width="${g.cell}" height="${g.cell}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ff00b9" stroke-width="2"/></svg>`,
  )
  await sharp(g.file)
    .extract({ left: 0, top: 0, width: g.cell, height: g.cell })
    .flatten({ background: '#faf6ef' })
    .composite([{ input: svg }])
    .png()
    .toFile(`${batch}/review/${g.id}-anchor.png`)
  entries.push({ ...g, patch, reviewed: false })
}
fs.writeFileSync(`${batch}/anchor-review.json`, JSON.stringify(entries, null, 2) + '\n')
console.log(entries.map((e) => e.id).join('\n'))
