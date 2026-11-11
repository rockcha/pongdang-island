import fs from 'node:fs'
import sharp from 'sharp'
const spec = await import(
  process.argv.includes('--needs-blink')
    ? './prepare-pet-needs-blink.mjs'
    : process.argv.includes('--needs')
    ? './prepare-pet-needs.mjs'
    : process.argv.includes('--eating')
    ? './prepare-pet-eating.mjs'
    : process.argv.includes('--calm')
      ? './prepare-pet-calm-idle.mjs'
      : './prepare-pet-preview-assets.mjs'
)
const { batch, sheets } = spec
const prepare = process.argv.includes('--prepare'),
  partial = process.argv.includes('--partial')
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
const records = []
const layouts = {}
const faces = spec.faces ?? {
  'sand-golem-idle': [248, 210, 200],
  'sand-golem-hungry': [380, 300, 270],
  'sand-golem-happy': [248, 204, 180],
  'wave-cat-idle': [285, 205, 190],
  'wave-cat-hungry': [400, 278, 270],
  'wave-cat-happy': [277, 203, 190],
  'mochi-dragon-idle': [192, 202, 180],
  'mochi-dragon-hungry': [276, 278, 258],
  'mochi-dragon-happy': [211, 208, 180],
  'jelly-seal-idle': [199, 200, 178],
  'jelly-seal-hungry': [292, 265, 256],
  'jelly-seal-happy': [206, 196, 178],
}
fs.mkdirSync(`${batch}/normalized`, { recursive: true })
for (const s of sheets) {
  const file = `${batch}/sources/${s.id}-sprite.source`
  if (partial && !fs.existsSync(file)) continue
  const raw = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    columns = s.columns
  if (Math.abs(raw.info.width / columns - raw.info.height / 2) > 1)
    throw Error('Wrong grid ' + s.id)
  const cell = Math.ceil(Math.max(raw.info.width / columns, raw.info.height / 2)),
    width = cell * columns,
    height = cell * 2,
    data = Buffer.alloc(width * height * 4)
  for (let f = 0; f < s.frames; f++) {
    const col = f % columns,
      row = Math.floor(f / columns),
      l = Math.round((col * raw.info.width) / columns),
      r = Math.round(((col + 1) * raw.info.width) / columns),
      t = Math.round((row * raw.info.height) / 2),
      b = Math.round(((row + 1) * raw.info.height) / 2)
    for (let y = t; y < b; y++)
      raw.data.copy(
        data,
        ((row * cell + y - t) * width + col * cell) * 4,
        (y * raw.info.width + l) * 4,
        (y * raw.info.width + r) * 4,
      )
  }
  const bounds = []
  for (let f = 0; f < s.frames; f++) {
    let l = cell,
      t = cell,
      r = -1,
      b = -1,
      opaque = 0
    for (let y = 0; y < cell; y++)
      for (let x = 0; x < cell; x++)
        if (
          data[((Math.floor(f / columns) * cell + y) * width + (f % columns) * cell + x) * 4 + 3] >=
          32
        ) {
          l = Math.min(l, x)
          t = Math.min(t, y)
          r = Math.max(r, x)
          b = Math.max(b, y)
          opaque++
        }
    const margin = Math.min(l, t, cell - r - 1, cell - b - 1)
    if (!opaque || margin < cell * (spec.minSourceMargin ?? 0.08) || Math.max(r - l + 1, b - t + 1) > cell * (spec.maxSourceOccupancy ?? 1))
      throw Error(`Unsafe original ${s.id} frame ${f}: margin ${margin}/${cell}`)
    bounds.push({ frame: f, left: l, top: t, width: r - l + 1, height: b - t + 1, margin, opaque })
  }
  const normalized = `${batch}/normalized/${s.id}.png`
  if (prepare) {
    await sharp(data, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(normalized)
    records.push({
      id: s.id,
      file: normalized,
      storage_path: s.sprite_sheet_path,
      cell,
      frames: s.frames,
      bounds,
    })
    continue
  }
  const anchors = read(`${batch}/registered-${s.frames}.json`),
    reg = anchors.find((r) => r.storage_path === s.sprite_sheet_path)
  const review = read(`${batch}/anchor-review.json`).find((r) => r.id === s.id)
  if (
    !reg ||
    reg.frames.length !== s.frames ||
    reg.frames.some((f) => !Number.isFinite(f.rmse) || f.rmse > 40) ||
    !review?.reviewed ||
    JSON.stringify(reg.patch) !== JSON.stringify(review.patch)
  )
    throw Error('Rejected rigid patch ' + s.id)
  const padding =
      Math.ceil(Math.max(...reg.frames.flatMap((f) => [Math.abs(f.dx), Math.abs(f.dy)]))) + 8,
    newCell = cell + padding * 2,
    w = newCell * columns,
    h = newCell * 2,
    out = Buffer.alloc(w * h * 4)
  for (const f of reg.frames) {
    if (!Number.isInteger(f.dx) || !Number.isInteger(f.dy)) throw Error('Noninteger shift')
    const ox = (f.frame % columns) * cell,
      oy = Math.floor(f.frame / columns) * cell,
      nx = (f.frame % columns) * newCell + padding - f.dx,
      ny = Math.floor(f.frame / columns) * newCell + padding - f.dy
    for (let y = 0; y < cell; y++)
      data.copy(
        out,
        ((ny + y) * w + nx) * 4,
        ((oy + y) * width + ox) * 4,
        ((oy + y) * width + ox + cell) * 4,
      )
  }
  const bytes = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
  if (!(await sharp(bytes).raw().toBuffer()).equals(out)) throw Error('RGBA changed')
  fs.writeFileSync(`${batch}/${s.sprite_sheet_path}`, bytes)
  fs.writeFileSync(`public/${s.sprite_sheet_path}`, bytes)
  records.push({
    ...reg,
    id: s.id,
    sourceCell: cell,
    cell: newCell,
    padding,
    bounds,
    rgbaPreserved: true,
  })
  const [x, y, headWidth] = faces[s.id]
  layouts[s.id] = { cell: newCell, anchor: [x + padding, y + padding], scale: 300 / headWidth }
  if(spec.eyes?.[s.id]) layouts[s.id].eyes=spec.eyes[s.id].map(([x,y,w,h])=>[x+padding,y+padding,w,h])
}
if (!prepare)
  fs.writeFileSync(
    spec.layoutPath ?? 'src/features/pets/pet-sprite-layouts.json',
    JSON.stringify(layouts, null, 2) + '\n',
  )
fs.writeFileSync(
  `${batch}/${prepare ? 'source-grids' : 'registration'}.json`,
  JSON.stringify(records, null, 2) + '\n',
)
console.log(JSON.stringify({ mode: prepare ? 'prepare' : 'bake', processed: records.length }))
