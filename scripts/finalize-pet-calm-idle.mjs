import fs from 'node:fs'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { batch } from './prepare-pet-calm-idle.mjs'
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')),
  hash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const manifest = read(`${batch}/manifest.json`),
  registrations = read(`${batch}/registration.json`),
  final = read(`${batch}/registered-final-8.json`)
const browser = read(`${batch}/review/browser-check.json`)
if (
  Object.keys(browser.results).length !== 4 ||
  browser.errors.length ||
  !browser.reducedMotionStable ||
  !browser.careStillAwardsOnce
)
  throw Error('Runtime review incomplete')
if (final.length !== 4 || final.some((r) => r.frames.some((f) => f.dx || f.dy || f.rmse > 40)))
  throw Error('Unverified final anchors')
for (const s of manifest.items) {
  const file = `${batch}/${s.sprite_sheet_path}`,
    r = registrations.find((r) => r.id === s.id),
    cell = r.cell
  Object.assign(s, {
    source_sprite: `sources/${s.id}-sprite.source`,
    source_sha256: hash(`${batch}/sources/${s.id}-sprite.source`),
    sprite_sha256: hash(file),
    rgbaPreserved: r.rgbaPreserved,
  })
  const sizes = r.bounds.slice(0, 4)
  // The whole resting silhouette remains stable; no action pose is hidden in
  // a slowed loop. The authored micro breathing lives inside that silhouette.
  for (const key of ['width', 'height'])
    if (Math.max(...sizes.map((b) => b[key])) - Math.min(...sizes.map((b) => b[key])) > cell * 0.02)
      throw Error('Breathing silhouette moves too much ' + s.id)
  for (const [label, color] of [
    ['light', '#faf6ef'],
    ['dark', '#193744'],
  ])
    await sharp(file)
      .flatten({ background: color })
      .resize(1200)
      .png()
      .toFile(`${batch}/review/${s.id}-${label}.png`)
  const order = [0, 1, 2, 3, 2, 1, 0, 1, 5, 6, 7, 2, 3, 2, 1],
    delays = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 100, 100, 100, 700, 1000, 1000, 1000],
    pages = []
  for (const f of order)
    pages.push(
      await sharp(file)
        .extract({ left: (f % 4) * cell, top: Math.floor(f / 4) * cell, width: cell, height: cell })
        .resize(300)
        .ensureAlpha()
        .raw()
        .toBuffer(),
    )
  await sharp(Buffer.concat(pages), {
    raw: { width: 300, height: 300 * pages.length, channels: 4, pageHeight: 300 },
  })
    .webp({ quality: 90, loop: 0, delay: delays })
    .toFile(`${batch}/review/${s.id}.webp`)
}
manifest.status = 'locally-verified'
manifest.repair_prompts = 'repair-prompts.json'
manifest.timing = {
  breathMs: 6000,
  blinkIntervalMs: [7000, 12000],
  blinkDurationMs: 300,
  automaticActionPoses: false,
}
manifest.verification = {
  sourceGrids: 'source-grids.json',
  registration: 'registration.json',
  finalAnchors: 'registered-final-8.json',
  headAndFeet: 'Fixed authored pose; only integer translation baked into PNG, no per-frame scaling',
  runtimeReview: 'review/browser-check.json',
  remoteDeployed: false,
}
fs.writeFileSync(`${batch}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
fs.writeFileSync(
  `${batch}/review/animated-preview.html`,
  `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>느린 펫 대기</title><style>body{font-family:sans-serif;background:#faf6ef;color:#49372f;padding:24px}main{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;text-align:center;border:1px solid #dfd6c5;border-radius:16px}img{width:280px;height:280px}</style><h1>조용히 쉬는 네 친구</h1><p>6초 호흡 · 가끔 눈 깜빡임</p><main>${manifest.items.map((s) => `<figure><img src="${s.id}.webp"><figcaption>${s.pet_id}</figcaption></figure>`).join('')}</main></html>`,
)
console.log(
  'Four quiet idle sheets verified; resting silhouettes vary by no more than 2% of a cell.',
)
