import fs from 'node:fs'
import sharp from 'sharp'
import { createHash } from 'node:crypto'

// Extend the game's existing editable overhead SVG artwork.
const root = 'public/arcade/tower-defense'
const kinds = ['shark', 'mako', 'dolphin', 'flyingFish', 'airJelly', 'cuttlefish']
const path = (d, fill, stroke = '#577b94', width = 3) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
const ellipse = (x, y, rx, ry, fill, stroke = 'none') =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`
const eyes = (y, distance = 10) =>
  ellipse(64 - distance, y, 2.6, 3, '#334f66') + ellipse(64 + distance, y, 2.6, 3, '#334f66')

function creature(kind, frame) {
  const motion = [0, 3, 0, -3][frame]
  if (['shark', 'mako', 'dolphin'].includes(kind)) {
    const dolphin = kind === 'dolphin'
    const body = dolphin ? '#91cbd0' : kind === 'mako' ? '#80a9d0' : '#a6b5c0'
    const ink = dolphin ? '#5a98a5' : '#58758e'
    const fins = path(
      `M49 64 Q24 57 20 42 Q43 43 54 49 M79 64 Q104 57 108 42 Q85 43 74 49`,
      body,
      ink,
    )
    const tail = path(
      `M58 30 L${42 + motion} 15 Q${55 + motion} 12 64 23 Q${73 + motion} 12 ${86 + motion} 15 L70 30 Z`,
      body,
      ink,
    )
    const shape = dolphin
      ? 'M64 24 C39 36 43 68 52 86 L58 98 L59 111 Q64 116 69 111 L70 98 L76 86 C85 68 89 36 64 24 Z'
      : 'M64 24 C40 35 36 63 45 85 Q53 104 64 111 Q75 104 83 85 C92 63 88 35 64 24 Z'
    const ridge = path('M64 40 L74 63 L64 74 L59 60 Z', dolphin ? '#78b6bf' : '#7a97ad', ink, 2)
    const details =
      kind === 'shark'
        ? path(
            'M46 68 L54 72 M45 76 L54 80 M74 72 L82 68 M74 80 L83 76 M58 87 L68 95',
            'none',
            '#718897',
            2,
          )
        : path('M52 79 Q64 89 76 79', 'none', '#c6e3e6', 3)
    return tail + fins + path(shape, body, ink) + ridge + details + eyes(91, 9)
  }
  if (kind === 'flyingFish') {
    const wings = path(
      `M53 54 Q31 ${24 + motion} 14 ${44 + motion} L20 77 Q38 83 54 72 M75 54 Q97 ${24 - motion} 114 ${44 - motion} L108 77 Q90 83 74 72`,
      '#c5e9f2',
      '#7da9c5',
    )
    return (
      wings +
      path(`M58 34 L${48 + motion} 17 L64 24 L80 17 L70 34`, '#a1ccde') +
      path('M64 28 C47 40 45 80 57 97 Q64 108 71 97 C83 80 81 40 64 28 Z', '#95c9e1') +
      path('M64 43 L64 79 M27 48 L48 65 M101 48 L80 65', 'none', '#e8f8fa', 2) +
      eyes(88, 6)
    )
  }
  if (kind === 'airJelly') {
    let ribbons = ''
    for (const x of [43, 57, 71, 85])
      ribbons += path(`M${x} 72 Q${x - 8 + motion} 88 ${x + motion} 108`, 'none', '#ad8eb8', 4)
    return (
      ribbons +
      ellipse(64, 52, 35 + motion * 0.3, 33, '#e3c4e6', '#ad8eb8') +
      ellipse(55, 40, 14, 9, '#f5e8f6') +
      path('M34 66 Q44 77 54 69 Q64 81 74 69 Q84 77 94 66', 'none', '#c09bc9') +
      eyes(60)
    )
  }
  let arms = ''
  for (const x of [47, 58, 70, 81])
    arms += path(`M${x} 76 Q${x + motion} 92 ${x + motion * 2} 109`, 'none', '#a685a3', 5)
  return (
    arms +
    path(
      `M47 35 Q${22 - motion} 47 37 77 L51 81 M81 35 Q${106 + motion} 47 91 77 L77 81`,
      '#dcc2da',
      '#a685a3',
    ) +
    path('M64 17 Q43 30 45 62 Q45 85 64 91 Q83 85 83 62 Q85 30 64 17 Z', '#c5a5c7', '#a685a3') +
    path('M64 29 Q54 43 55 60', 'none', '#e7d2e5', 4) +
    eyes(77)
  )
}

function turret(kind, frame) {
  const recoil = [0, 3, -2, 1][frame]
  if (kind === 'sniper') {
    return (
      path('M31 85 Q22 62 40 48 L88 48 Q106 62 97 85 L84 103 H44 Z', '#d8dce8', '#859cb6') +
      ellipse(64, 73, 27, 24, '#e9eaf3', '#859cb6') +
      path(
        `M58 67 V${15 + recoil} L64 ${9 + recoil} L70 ${15 + recoil} V67 Z`,
        '#accddd',
        '#6c93ac',
      ) +
      path(`M53 ${29 + recoil} H75`, 'none', '#718fae', 5) +
      ellipse(64, 71, 13, 13, frame ? '#f5ffff' : '#cae4eb', '#91b1c3') +
      ellipse(60, 67, 4, 4, '#ffffff') +
      eyes(92, 7)
    )
  }
  if (kind === 'harpoon') {
    const ink = '#ae786c'
    return (
      path(
        `M45 69 Q17 76 21 48 L31 39 L29 58 L39 57 L42 39 Q56 45 45 69 M83 69 Q111 76 107 48 L97 39 L99 58 L89 57 L86 39 Q72 45 83 69`,
        '#e6b09b',
        ink,
      ) +
      ellipse(64, 78, 22, 27, '#efc7ac', ink) +
      path('M48 91 H80 M49 100 H79', 'none', ink, 3) +
      path(
        `M61 76 V${28 + recoil} H55 L64 ${10 + recoil} L73 ${28 + recoil} H67 V76 Z`,
        '#c0d7d8',
        '#638995',
      ) +
      path('M54 55 H74 M52 65 H76', 'none', ink, 4) +
      eyes(82, 8)
    )
  }
  if (kind === 'frost') {
    let branches = ''
    for (const side of [-1, 1]) {
      branches += path(
        `M64 87 Q${64 + side * 28} 75 ${64 + side * 28} 44 M${64 + side * 25} 64 L${64 + side * 42} 51 M${64 + side * 25} 65 L${64 + side * 12} 43`,
        'none',
        '#7fb6c3',
        11,
      )
      branches += path(`M64 87 Q${64 + side * 28} 75 ${64 + side * 28} 44`, 'none', '#b8e2e7', 5)
    }
    return (
      ellipse(64, 93, 30, 15, '#cce2d7', '#91b4b6') +
      branches +
      path('M64 16 L79 39 L72 77 L56 77 L49 39 Z', frame ? '#e7fcff' : '#b9e3ee', '#79adbf') +
      path('M64 19 V72 M51 40 H77', 'none', '#edfaff', 3) +
      eyes(91, 8)
    )
  }
  const multiple = kind === 'salvo'
  const body = multiple ? '#edc7a5' : '#abd7df'
  const ink = multiple ? '#ae876f' : '#658eaa'
  let shape = multiple
    ? path(
        'M64 23 L75 47 L104 44 L90 67 L106 92 L78 91 L64 111 L50 91 L22 92 L38 67 L24 44 L53 47 Z',
        body,
        ink,
      )
    : ellipse(64, 73, 34, 30, body, ink)
  const tubes = multiple ? [37, 55, 73, 91] : [49, 79]
  for (const x of tubes) {
    shape += path(
      `M${x - 6} 68 V${29 + recoil} L${x} ${19 + recoil} L${x + 6} ${29 + recoil} V68 Z`,
      '#dce8e7',
      ink,
    )
    shape += path(`M${x - 6} ${40 + recoil} H${x + 6}`, 'none', multiple ? '#da9f7f' : '#8bbdcf', 5)
  }
  return shape + ellipse(64, 77, 17, 13, multiple ? '#f8dfbb' : '#daeff1', ink) + eyes(77, 7)
}
const group = (drawing, x = 0) =>
  `<g transform="translate(${x + 25.6} 25.6) scale(1.6)">${drawing}</g>`
const svg = (content, width = 256) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="256" viewBox="0 0 ${width} 256">${content}</svg>`
const files = []
async function write(name, bytes) {
  fs.writeFileSync(`${root}/${name}`, bytes)
  files.push({
    path: `arcade/tower-defense/${name}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  })
}
const newRows = []
const turretKinds = ['missile', 'salvo', 'sniper', 'harpoon', 'frost']
for (const kind of [...kinds, ...turretKinds]) {
  const draw = kinds.includes(kind) ? creature : turret
  const original = svg(group(draw(kind, 0)))
  const sheet = svg(
    Array.from({ length: 4 }, (_, f) => group(draw(kind, f), f * 256)).join(''),
    1024,
  )
  await write(`${kind}-v1.svg`, original)
  await write(`${kind}-v1-sheet.svg`, sheet)
  const bytes = await sharp(Buffer.from(sheet)).png().toBuffer()
  await write(`${kind}-v1-sprite.png`, bytes)
  if (kinds.includes(kind)) newRows.push(bytes)
}
const existing = fs.readFileSync(`${root}/enemies-v5-sprite.png`)
const meta = await sharp(existing).metadata()
if (meta.width !== 1024 || meta.height !== 12 * 256) throw Error('Unexpected base enemy atlas')
const expanded = await sharp({
  create: { width: 1024, height: 18 * 256, channels: 4, background: '#00000000' },
})
  .composite([
    { input: existing, left: 0, top: 0 },
    ...newRows.map((input, index) => ({ input, left: 0, top: (12 + index) * 256 })),
  ])
  .png()
  .toBuffer()
await write('enemies-v6-sprite.png', expanded)
fs.writeFileSync(
  `${root}/expansion-art-manifest.json`,
  JSON.stringify(
    {
      source: 'scripts/build-tower-defense-expansion-art.mjs',
      cell: 256,
      enemyOrder: kinds,
      baseAtlas: 'enemies-v5-sprite.png',
      files,
    },
    null,
    2,
  ) + '\n',
)
fs.mkdirSync('artifacts/tower-defense', { recursive: true })
const preview = svg(
  [...kinds, ...turretKinds]
    .map((kind, i) => group((kinds.includes(kind) ? creature : turret)(kind, 0), i * 256))
    .join(''),
  (kinds.length + turretKinds.length) * 256,
)
await sharp(Buffer.from(preview))
  .flatten({ background: '#e3eee9' })
  .png()
  .toFile('artifacts/tower-defense/expansion-art-review.png')
console.log(`Built ${files.length} expansion assets`)
