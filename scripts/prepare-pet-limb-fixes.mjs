import fs from 'node:fs'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
const batch = process.argv[2]
if (!batch) throw Error('Usage: node scripts/prepare-pet-limb-fixes.mjs <batch directory>')
const inputs = JSON.parse(fs.readFileSync(`${batch}/generation-inputs.json`, 'utf8'))
fs.mkdirSync('tmp/pet-limb-fix', { recursive: true })
const root = batch
fs.mkdirSync(`${root}/sources`, { recursive: true })
fs.mkdirSync(`${root}/pets`, { recursive: true })
fs.mkdirSync('artifacts/pet-limb-fix', { recursive: true })
fs.writeFileSync('tmp/pet-limb-fix/batch-path.txt', root)
const sha = (b) => createHash('sha256').update(b).digest('hex')
function ground(data, w) {
  let last = -1
  for (let y = 0; y < w; y++) {
    let count = 0
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] >= 128) count++
    if (count >= w * 0.035) last = y
  }
  if (last < 0) throw Error('Missing foot support')
  return last
}
function cleanIslands(data, w) {
  const solid = new Uint8Array(w * w),
    queue = new Int32Array(w * w),
    components = []
  for (let n = 0; n < w * w; n++) {
    if (solid[n] || data[n * 4 + 3] < 32) continue
    let start = 0,
      end = 0
    queue[end++] = n
    solid[n] = 1
    const part = []
    while (start < end) {
      const at = queue[start++]
      part.push(at)
      const x = at % w,
        y = Math.floor(at / w)
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const xx = x + dx,
          yy = y + dy,
          p = yy * w + xx
        if (xx < 0 || xx >= w || yy < 0 || yy >= w || solid[p] || data[p * 4 + 3] < 32) continue
        solid[p] = 1
        queue[end++] = p
      }
    }
    components.push(part)
  }
  components.sort((a, b) => b.length - a.length)
  if (!components[0] || components[0].length < w * w * 0.05)
    throw Error('Missing connected pet silhouette')
  const keep = new Uint8Array(w * w)
  for (const n of components[0]) {
    const x = n % w,
      y = Math.floor(n / w)
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const xx = x + dx,
          yy = y + dy
        if (xx >= 0 && xx < w && yy >= 0 && yy < w) keep[yy * w + xx] = 1
      }
  }
  let removed = 0
  for (let n = 0; n < w * w; n++)
    if (!keep[n] && data[n * 4 + 3]) {
      data[n * 4 + 3] = 0
      removed++
    }
  return removed
}
const items = [],
  review = []
for (const c of inputs) {
  const generated = c.generated,
    genBytes = fs.readFileSync(generated),
    gm = await sharp(genBytes).metadata(),
    gc = gm.width / 2
  const sourceBytes = fs.readFileSync(c.path),
    { data: original, info } = await sharp(sourceBytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
  const destination = Buffer.from(original),
    cell = c.cell,
    cut = Math.round(cell * 0.625),
    feather = 6
  const mapping =
    c.id === 'mochi-dragon'
      ? { 0: 0, 1: 0, 2: 0, 3: 0, 4: 2, 5: 2, 6: 2, 7: 2 }
      : c.id === 'hedge-pin'
        ? { 4: 0, 5: 0, 6: 0, 7: 0, 14: 2, 15: 3 }
        : { 4: 0, 5: 0, 6: 0, 7: 0, 12: 1, 13: 2, 14: 3, 15: 3 }
  const freshCells = new Map(),
    measurements = []
  for (const i of new Set(Object.values(mapping)))
    freshCells.set(
      i,
      await sharp(genBytes)
        .extract({ left: (i % 2) * gc, top: Math.floor(i / 2) * gc, width: gc, height: gc })
        .resize(cell, cell)
        .ensureAlpha()
        .raw()
        .toBuffer(),
    )
  for (const [frameString, i] of Object.entries(mapping)) {
    const f = Number(frameString),
      old = Buffer.alloc(cell * cell * 4),
      fresh = freshCells.get(i)
    for (let y = 0; y < cell; y++)
      original.copy(
        old,
        y * cell * 4,
        ((Math.floor(f / 4) * cell + y) * info.width + (f % 4) * cell) * 4,
        ((Math.floor(f / 4) * cell + y) * info.width + (f % 4) * cell + cell) * 4,
      )
    const oldGround = ground(old, cell),
      newGround = ground(fresh, cell),
      dy = oldGround - newGround,
      fixed = Buffer.from(old)
    for (let y = cut - feather; y < cell; y++)
      for (let x = 0; x < cell; x++) {
        const at = (y * cell + x) * 4,
          sy = y - dy,
          blend = Math.max(0, Math.min(1, (y - (cut - feather)) / (feather * 2))),
          from = sy >= 0 && sy < cell ? (sy * cell + x) * 4 : -1
        const oa = old[at + 3] / 255,
          na = from >= 0 ? fresh[from + 3] / 255 : 0,
          a = oa * (1 - blend) + na * blend
        for (let rgb = 0; rgb < 3; rgb++)
          fixed[at + rgb] =
            a > 0
              ? Math.round(
                  (old[at + rgb] * oa * (1 - blend) +
                    (from >= 0 ? fresh[from + rgb] : 0) * na * blend) /
                    a,
                )
              : 0
        fixed[at + 3] = Math.round(a * 255)
      }
    const removed = cleanIslands(fixed, cell)
    if (ground(fixed, cell) !== oldGround) throw Error(`Ground changed ${c.id}/${f}`)
    let changedHead = 0,
      headPixels = 0
    for (let y = 0; y < cut - feather; y++)
      for (let x = 0; x < cell; x++) {
        const at = (y * cell + x) * 4
        if (old[at + 3] < 128) continue
        headPixels++
        if (!old.subarray(at, at + 4).equals(fixed.subarray(at, at + 4))) changedHead++
      }
    if (changedHead) throw Error(`Opaque head changed ${c.id}/${f}: ${changedHead}`)
    for (let y = 0; y < cell; y++)
      fixed.copy(
        destination,
        ((Math.floor(f / 4) * cell + y) * info.width + (f % 4) * cell) * 4,
        y * cell * 4,
        (y + 1) * cell * 4,
      )
    measurements.push({
      frame: f,
      generatedCell: i,
      bodyTranslationY: dy,
      ground: oldGround,
      headPreserved: true,
      headPixels,
      detachedPixelsRemoved: removed,
    })
    if (c.frames.includes(f)) {
      const n = review.length / 2
      const oldImage = await sharp(old, { raw: { width: cell, height: cell, channels: 4 } })
        .resize(230, 230)
        .flatten({ background: '#fff8ee' })
        .png()
        .toBuffer()
      const newImage = await sharp(fixed, { raw: { width: cell, height: cell, channels: 4 } })
        .resize(230, 230)
        .flatten({ background: '#fff8ee' })
        .png()
        .toBuffer()
      review.push(
        { input: oldImage, left: 0, top: n * 240 },
        { input: newImage, left: 240, top: n * 240 },
      )
    }
  }
  const filename = c.path.split('/').at(-1).replace('_v1_', '_v2_'),
    output = `public/pets/${filename}`
  const result = await sharp(destination, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()
  fs.writeFileSync(output, result)
  fs.writeFileSync(
    `${root}/pets/${filename}`,
    result,
  ) /* The reviewed edit inputs and imagegen outputs already live in this batch. */
  items.push({
    id: c.id,
    source: c.path,
    source_sha256: sha(sourceBytes),
    edited_poses: `sources/${c.id}-edited-poses.png`,
    edited_poses_sha256: sha(genBytes),
    sprite_sheet_path: `pets/${filename}`,
    sprite_sha256: sha(result),
    width: info.width,
    height: info.height,
    cell,
    grid: [4, c.id === 'mochi-dragon' ? 2 : 4],
    headPreservationCut: cut - feather,
    repairedFrames: Object.keys(mapping).map(Number),
    measurements,
  })
  console.log(c.id, measurements.length, 'frames', result.length, 'bytes')
}
fs.writeFileSync(
  `${root}/assembly-verification.json`,
  JSON.stringify(
    {
      generator: 'built-in image_gen',
      scope:
        'Repair extra pet forelimbs in 7 species. No species, prices, jobs or behavior changes.',
      processing:
        'Edited pose cells normalized to original cell size. Original upper head pixels retained, 12px neck seam feathered, corrected lower body translated to original foot support row. Detached alpha islands removed without eroding the connected silhouette. Unaffected cells copied byte-for-byte in decoded RGBA. Original v1 assets remain unchanged.',
      items,
    },
    null,
    2,
  ) + '\n',
)
await sharp({
  create: { width: 480, height: (review.length / 2) * 240, channels: 4, background: '#fff8ee' },
})
  .composite(review)
  .png()
  .toFile('artifacts/pet-limb-fix/before-after-all.png')
fs.writeFileSync('tmp/pet-limb-fix/assembly.json', JSON.stringify({ root, items }, null, 2) + '\n')
