import fs from 'node:fs'
import sharp from 'sharp'
const normal = JSON.parse(fs.readFileSync('src/features/pets/pet-sprite-layouts.json', 'utf8'))
const calm = JSON.parse(fs.readFileSync('src/features/pets/pet-calm-idle-layouts.json', 'utf8'))
const out = {}
const eating = JSON.parse(fs.readFileSync('src/features/pets/pet-eating-layouts.json', 'utf8'))
const needs = JSON.parse(fs.readFileSync('src/features/pets/pet-needs-layouts.json', 'utf8'))
const registration = JSON.parse(fs.readFileSync('src/features/pets/pet-motion-registration.json','utf8'))
for (const id of ['sand-golem', 'wave-cat', 'mochi-dragon', 'jelly-seal']) {
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity
  for (const [kind, suffix, columns] of [
    ['idle', 'idle8_v2', 4],
    ['hungry', 'hungry4_v1', 2],
    ['happy', 'happy8_v1', 4],
    ['eat', 'eat8_v1', 4],
    ['needs', 'needs8_v1', 4],
  ]) {
    const layout = (kind === 'idle' ? calm : kind === 'eat' ? eating : kind === 'needs' ? needs : normal)[`${id}-${kind}`],
      { data, info } = await sharp(`public/pets/${id}_${suffix}_sprite.png`)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
    if (info.width !== layout.cell * columns || info.height !== layout.cell * 2)
      throw Error('Layout mismatch ' + id)
    const aligned=kind === 'hungry' ? layout : registration[id][kind]
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] >= 32) {
          const dx = ((x % layout.cell) - aligned.anchor[0]) * aligned.scale,
            dy = ((y % layout.cell) - aligned.anchor[1]) * aligned.scale
          left = Math.min(left, dx)
          right = Math.max(right, dx)
          top = Math.min(top, dy)
          bottom = Math.max(bottom, dy)
        }
  }
  // One presentation scale and origin across every pose of a species. Fit the
  // complete silhouette, including asymmetric tails, rather than just its face.
  const scale = Math.min(1, 576 / (right - left), 532 / (bottom - top))
  const x = 320 - ((left + right) * scale) / 2
  const y = Math.max(28 - top * scale, Math.min(260, 560 - bottom * scale))
  out[id] = { scale, anchor: [x, y], bounds: [left, top, right, bottom] }
}
fs.writeFileSync('src/features/pets/pet-render-layouts.json', JSON.stringify(out, null, 2) + '\n')
console.log('Fitted all 20 pet sheets to a shared per-species stage envelope.')
