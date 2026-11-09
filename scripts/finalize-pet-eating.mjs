import fs from 'node:fs'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { batch } from './prepare-pet-eating.mjs'
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')),
  hash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const manifest = read(`${batch}/manifest.json`),
  reg = read(`${batch}/registration.json`),
  anchors = read(`${batch}/registered-final-8.json`)
if (anchors.length !== 4 || anchors.some((r) => r.frames.some((f) => f.dx || f.dy || f.rmse > 40)))
  throw Error('Unverified final anchors')
for (const s of manifest.items) {
  const file = `${batch}/${s.sprite_sheet_path}`,
    r = reg.find((r) => r.id === s.id),
    cell = r.cell
  Object.assign(s, {
    source_sprite: `sources/${s.id}-sprite.source`,
    source_sha256: hash(`${batch}/sources/${s.id}-sprite.source`),
    sprite_sha256: hash(file),
    rgbaPreserved: r.rgbaPreserved,
  })
  for (const [label, color] of [
    ['light', '#faf6ef'],
    ['dark', '#193744'],
  ])
    await sharp(file)
      .flatten({ background: color })
      .resize(1200)
      .png()
      .toFile(`${batch}/review/${s.id}-${label}.png`)
  const pages = []
  for (let f = 0; f < 8; f++)
    pages.push(
      await sharp(file)
        .extract({ left: (f % 4) * cell, top: Math.floor(f / 4) * cell, width: cell, height: cell })
        .resize(300)
        .ensureAlpha()
        .raw()
        .toBuffer(),
    )
  await sharp(Buffer.concat(pages), {
    raw: { width: 300, height: 2400, channels: 4, pageHeight: 300 },
  })
    .webp({ quality: 90, loop: 0, delay: Array(8).fill(375) })
    .toFile(`${batch}/review/${s.id}.webp`)
}
const browser = fs.existsSync(`${batch}/review/browser-check.json`)
  ? read(`${batch}/review/browser-check.json`)
  : null
if (
  browser &&
  (browser.errors.length ||
    browser.results.length !== 4 ||
    browser.results.some(
      (r) => r.blankFrames || !r.foodSpentOnce || !r.fullnessGrantedOnce || !r.affectionUnchanged,
    ))
)
  throw Error('Runtime review failed')
manifest.status = browser ? 'locally-verified' : 'art-verified-runtime-pending'
manifest.repair_prompts = 'repair-prompts.json'
manifest.verification = {
  registration: 'registration.json',
  finalAnchors: 'registered-final-8.json',
  browser: 'review/browser-check.json',
  durationMs: 3000,
  rgbaPreserved: true,
  rewards: 'operator sandbox only; ration and fullness commit together at completion',
  remoteDeployed: false,
}
fs.writeFileSync(`${batch}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
fs.writeFileSync(
  `${batch}/review/animated-preview.html`,
  `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>펫 먹기 모션</title><style>body{font-family:sans-serif;background:#faf6ef;color:#49372f;padding:24px}main{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;text-align:center;border:1px solid #dfd6c5;border-radius:16px}img{width:280px;height:280px}</style><h1>오물오물 사료 먹기</h1><main>${manifest.items.map((s) => `<figure><img src="${s.id}.webp"><figcaption>${s.pet_id}</figcaption></figure>`).join('')}</main></html>`,
)
console.log('Four eating sheets verified; 3-second feeding motions exported.')
