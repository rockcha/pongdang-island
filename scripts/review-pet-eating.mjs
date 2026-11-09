import fs from 'node:fs'
import sharp from 'sharp'
import { batch, sheets } from './prepare-pet-eating.mjs'
const patches = {
  'sand-golem-eat': [180, 120, 65, 25],
  'wave-cat-eat': [258, 178, 32, 24],
  'mochi-dragon-eat': [170, 86, 65, 35],
  'jelly-seal-eat': [177, 164, 27, 22],
}
const entries = []
for (const s of sheets) {
  const file = `${batch}/normalized/${s.id}.png`
  if (!fs.existsSync(file)) continue
  const meta = await sharp(file).metadata(),
    cell = meta.width / 4,
    patch = patches[s.id],
    [x, y, w, h] = patch
  await sharp(file)
    .extract({ left: 0, top: 0, width: cell, height: cell })
    .flatten({ background: '#faf6ef' })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${cell}" height="${cell}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ff00b9" stroke-width="2"/></svg>`,
        ),
      },
    ])
    .png()
    .toFile(`${batch}/review/${s.id}-anchor.png`)
  entries.push({ id: s.id, file, storage_path: s.sprite_sheet_path, patch, reviewed: false })
}
fs.writeFileSync(`${batch}/anchor-review.json`, JSON.stringify(entries, null, 2) + '\n')
