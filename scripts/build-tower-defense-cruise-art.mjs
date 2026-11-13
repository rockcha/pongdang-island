import fs from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

// Extend the existing overhead SVG art, preserving its outlines and fixed firing anchor.
const root = 'public/arcade/tower-defense',
  batch = 'assets/storage-upload/new/20261113-190411'
fs.mkdirSync(`${batch}/arcade/tower-defense`, { recursive: true })
function drawing(frame) {
  const recoil = [0, 3, 1, 0][frame],
    light = frame === 1 ? '#f7fcff' : '#b9dae7'
  return `<g stroke-linecap="round" stroke-linejoin="round">
 <circle cx="64" cy="68" r="42" fill="#e6e9df" stroke="#819a9d" stroke-width="3"/>
 <circle cx="64" cy="68" r="32" fill="#f4f0e1" stroke="#b5c4bd" stroke-width="2"/>
 <path d="M39 36 Q18 51 24 78 Q31 101 59 105 Q40 91 41 70 Q40 50 54 32Z" fill="#ead6a3" stroke="#af996d" stroke-width="3"/>
 <path d="M34 48 Q24 71 41 88" fill="none" stroke="#fff0c7" stroke-width="3"/>
 <path d="M48 78 V${30 + recoil} Q48 ${18 + recoil} 64 ${12 + recoil} Q80 ${18 + recoil} 80 ${30 + recoil} V78 Q64 89 48 78Z" fill="#dce9e9" stroke="#7796a4" stroke-width="3"/>
 <path d="M54 ${34 + recoil} Q64 ${26 + recoil} 74 ${34 + recoil} V${49 + recoil} H54Z" fill="${light}" stroke="#8bb3c6" stroke-width="2"/>
 <path d="M64 ${16 + recoil} V${28 + recoil} M54 59 H74 M54 67 H74" fill="none" stroke="#fff9e7" stroke-width="3"/>
 <path d="M47 51 L39 62 V80 L48 75 M81 51 L89 62 V80 L80 75" fill="#a8c8d5" stroke="#7796a4" stroke-width="2.5"/>
 <circle cx="64" cy="81" r="13" fill="#f4ebd3" stroke="#af996d" stroke-width="2.5"/>
 <path d="M68 72 A9 9 0 1 0 71 86 A8 8 0 0 1 68 72Z" fill="#d4ba7d"/>
 <circle cx="87" cy="42" r="4" fill="${light}" stroke="#7796a4" stroke-width="2"/>
 </g>`
}
const group = (frame, x = 0) =>
  `<g transform="translate(${x + 25.6} 25.6) scale(1.6)">${drawing(frame)}</g>`
const svg = (body, width = 256) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="256" viewBox="0 0 ${width} 256">${body}</svg>`
const files = []
function save(name, bytes) {
  fs.writeFileSync(`${root}/${name}`, bytes)
  fs.writeFileSync(`${batch}/arcade/tower-defense/${name}`, bytes)
  files.push({
    path: `arcade/tower-defense/${name}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  })
}
const sheet = svg(Array.from({ length: 4 }, (_, frame) => group(frame, frame * 256)).join(''), 1024)
save('cruise-v1.svg', svg(group(0)))
save('cruise-v1-sheet.svg', sheet)
save('cruise-v1-sprite.png', await sharp(Buffer.from(sheet)).png().toBuffer())
const manifest = {
  source: 'scripts/build-tower-defense-cruise-art.mjs',
  method:
    'Native editable SVG extending the established overhead tower artwork; no external bitmap references.',
  frameAnchor: { x: 128, y: 128 },
  columns: 4,
  rows: 1,
  cell: 256,
  files,
}
fs.writeFileSync(`${root}/cruise-art-manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
fs.writeFileSync(`${batch}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
fs.mkdirSync('artifacts/tower-defense', { recursive: true })
await sharp(Buffer.from(sheet))
  .flatten({ background: '#e3eee9' })
  .png()
  .toFile('artifacts/tower-defense/cruise-art-review.png')
console.log('Built cruise tower thumbnail, four firing frames, and hashed manifest')
