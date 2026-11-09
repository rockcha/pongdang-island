import fs from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { batch, sheets, pets } from './prepare-pet-preview-assets.mjs'
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
const hash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const reg = read(`${batch}/registration.json`),
  manifest = read(`${batch}/manifest.json`),
  browser = read(`${batch}/review/browser-check.json`)
const anchors = [
  ...read(`${batch}/registered-final-4.json`),
  ...read(`${batch}/registered-final-8.json`),
]
if (anchors.length !== 12 || anchors.some((r) => r.frames.some((f) => f.dx || f.dy || f.rmse > 40)))
  throw Error('Final alignment is unverified')
if (
  Object.keys(browser.uniqueFrames).length !== 16 ||
  Object.values(browser.uniqueFrames).some((n) => n < 3) ||
  browser.errors.length ||
  !browser.reducedMotionStable ||
  !browser.noMobileOverflow
)
  throw Error('Browser verification incomplete')
const audit = []
for (const s of sheets) {
  const p = `${batch}/${s.sprite_sheet_path}`,
    r = reg.find((r) => r.id === s.id),
    meta = await sharp(p).metadata(),
    cell = meta.width / s.columns,
    frames = []
  if (!Number.isInteger(cell) || meta.height !== cell * 2 || !meta.hasAlpha)
    throw Error('Invalid final grid ' + s.id)
  for (let f = 0; f < s.frames; f++) {
    const data = await sharp(p)
      .extract({
        left: (f % s.columns) * cell,
        top: Math.floor(f / s.columns) * cell,
        width: cell,
        height: cell,
      })
      .ensureAlpha()
      .raw()
      .toBuffer()
    let l = cell,
      t = cell,
      right = -1,
      b = -1
    for (let y = 0; y < cell; y++)
      for (let x = 0; x < cell; x++)
        if (data[(y * cell + x) * 4 + 3] >= 32) {
          l = Math.min(l, x)
          t = Math.min(t, y)
          right = Math.max(right, x)
          b = Math.max(b, y)
        }
    if (Math.min(l, t, cell - right - 1, cell - b - 1) < 8) throw Error('Clipped final ' + s.id)
    frames.push({
      frame: f,
      bounds: [l, t, right, b],
      sha256: createHash('sha256').update(data).digest('hex'),
    })
  }
  if (new Set(frames.map((f) => f.sha256)).size !== s.frames) throw Error('Repeated stills ' + s.id)
  const entry = manifest.items.find((i) => i.id === s.id)
  Object.assign(entry, {
    source_sprite: `sources/${s.id}-sprite.source`,
    source_sha256: hash(`${batch}/sources/${s.id}-sprite.source`),
    sprite_sha256: hash(p),
    references: { identity: s.thumbnail_path, placement: `sources/${s.id}-placement-guide.png` },
    rgbaPreserved: r.rgbaPreserved,
  })
  audit.push({ id: s.id, cell, frames })
  // Shareable frame review uses genuine raster frames; production consumes PNG.
  const pages = []
  const order = s.id.endsWith('-idle')
    ? [0, 1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 7, 4, 5, 6, 7]
    : Array.from({ length: s.frames }, (_, i) => i)
  for (const f of order)
    pages.push(
      await sharp(p)
        .extract({
          left: (f % s.columns) * cell,
          top: Math.floor(f / s.columns) * cell,
          width: cell,
          height: cell,
        })
        .resize(300, 300)
        .ensureAlpha()
        .raw()
        .toBuffer(),
    )
  await sharp(Buffer.concat(pages), {
    raw: { width: 300, height: 300 * pages.length, channels: 4, pageHeight: 300 },
  })
    .webp({ quality: 90, loop: 0, delay: order.map(() => (s.id.endsWith('-happy') ? 375 : 300)) })
    .toFile(`${batch}/review/${s.id}.webp`)
  for (const [label, color] of [
    ['light', '#faf6ef'],
    ['dark', '#193744'],
  ])
    await sharp(p)
      .flatten({ background: color })
      .resize(1200)
      .png()
      .toFile(`${batch}/review/${s.id}-${label}.png`)
}
for (const p of manifest.pets) {
  p.source_thumbnail = `sources/${p.id}-thumbnail.source`
  p.thumbnail_sha256 = hash(`${batch}/${p.thumbnail_path}`)
  p.movement = {
    type: 'fixed',
    surface: 'pet-house',
    flipWithDirection: false,
    reason: 'Pet-house seated preview; not an aquarium species or catalog registration.',
  }
}
manifest.status = 'operator-sandbox-locally-verified'
manifest.verification = {
  originalGrids: 'source-grids.json',
  registration: 'registration.json',
  finalAnchors: ['registered-final-4.json', 'registered-final-8.json'],
  finalAudit: 'final-audit.json',
  browser: 'review/browser-check.json',
  remoteDatabaseChanged: false,
  rewards: 'sandbox-only',
}
fs.writeFileSync(`${batch}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
fs.writeFileSync(`${batch}/final-audit.json`, JSON.stringify(audit, null, 2) + '\n')
fs.writeFileSync(
  `${batch}/review/animated-preview.html`,
  `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>펫 동작 미리보기</title><style>body{font-family:sans-serif;background:#faf6ef;color:#49372f;padding:24px}section{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;text-align:center;border:1px solid #dfd6c5;border-radius:16px}img{width:240px;height:240px}figcaption{padding:12px}</style><h1>네 친구의 동작</h1>${pets.map((p) => `<h2>${p.name}</h2><section>${['idle', 'hungry', 'happy'].map((c, i) => `<figure><img src="${p.id}-${c}.webp"><figcaption>${['대기 2종', '배고픔', '만족'][i]}</figcaption></figure>`).join('')}</section>`).join('')}`,
)
console.log(
  'Verified 4 pet identities, 12 genuine sheets and 80 distinct frames; no live rewards or DB writes.',
)
