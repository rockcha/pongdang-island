// Strict overhead silhouettes. Eyes are dots on the upper surface; no mouths,
// upright faces, mounting plates or perspective shading.
const path = (d, fill, stroke, width = 4) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`
const circle = (x, y, r, fill, stroke = 'none', width = 4) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`
const eyes = (y, ink, x = 53, gap = 22) => circle(x, y, 3.2, ink) + circle(x + gap, y, 3.2, ink)
function baseTower(kind, frame = 0) {
  const recoil = [0, 3, -2, 1][frame]
  if (kind === 'octopus') {
    const ink = '#a36f88',
      body = '#edb3c5'
    return (
      path(
        `M51 48 Q60 ${34 + recoil} 51 ${17 + recoil} L77 ${17 + recoil} Q68 ${34 + recoil} 77 48 Z`,
        body,
        ink,
        5,
      ) +
      circle(64, 76, 34, body, ink, 5) +
      path(`M44 ${16 + recoil} H84`, 'none', ink, 7) +
      eyes(62, '#97647f')
    )
  }
  if (kind === 'mortar') {
    const ink = '#aa8b6c',
      body = '#e5c59c'
    return (
      path(`M48 55 L45 ${19 + recoil} Q64 ${7 + recoil} 83 ${19 + recoil} L80 55 Z`, body, ink, 5) +
      circle(64, 76, 33, body, ink, 5) +
      circle(64, 76, 24, '#efdab7', ink, 3) +
      path(`M42 ${19 + recoil} Q64 ${8 + recoil} 86 ${19 + recoil}`, 'none', ink, 7) +
      eyes(68, ink)
    )
  }
  if (kind === 'flame') {
    const ink = '#b88373',
      body = '#eeb998'
    return (
      path(
        'M64 35 Q73 30 80 47 L103 49 Q115 57 94 73 L98 96 Q94 110 73 94 L53 107 Q38 109 41 85 L20 73 Q15 61 39 58 L44 36 Q51 26 64 35 Z',
        body,
        ink,
        4,
      ) +
      path(`M54 52 L54 ${18 + recoil} L74 ${18 + recoil} L74 52 Z`, '#e8ceab', ink, 4) +
      path(`M50 ${18 + recoil} H78`, 'none', ink, 6) +
      circle(64, 72, 22, '#f3cdb0', ink, 3) +
      eyes(65, ink)
    )
  }
  if (kind === 'laser') {
    const ink = '#7d9fb7',
      body = '#c5dce7',
      core = frame ? '#edf9fa' : '#a7cfdd'
    return (
      path(`M57 46 L57 ${18 + recoil} L71 ${18 + recoil} L71 46 Z`, body, ink, 4) +
      circle(64, 72, 32, body, ink, 4) +
      circle(64, 72, 24, '#e0eaf0', ink, 3) +
      path('M64 46 L78 65 L64 82 L50 65 Z', core, ink, 3) +
      eyes(86, ink, 54, 20)
    )
  }
  if (kind === 'plasma') {
    const ink = '#9c88b6',
      body = '#d0bfe2'
    let tails = ''
    for (const x of [45, 58, 71, 84])
      tails += path(`M${x} 80 Q${x - 9} 102 ${x + 4} 106`, 'none', ink, 5)
    return (
      tails +
      path(`M53 43 V${20 + recoil} M75 43 V${20 + recoil}`, 'none', ink, 6) +
      circle(64, 64, 31, body, ink, 4) +
      circle(64, 64, 22, '#e6d9ec', ink, 3) +
      eyes(57, ink) +
      circle(64, frame ? 23 : 30, frame ? 7 : 5, frame ? '#f4edf8' : '#baa3d0', ink, 2)
    )
  }
  if (kind === 'anemone') {
    const ink = '#a5a67f',
      body = '#dce1b6'
    let petals = ''
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        r = frame ? 32 : 30
      petals += circle(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 10, body, ink, 3)
    }
    return (
      petals +
      circle(64, 64, 25, '#eee1a5', ink, 4) +
      circle(64, 64, 16, frame ? '#fff1ba' : '#f1e5b6', 'none') +
      eyes(59, ink, 55, 18)
    )
  }
  const ink = '#669d91',
    body = '#acd6c7'
  return (
    path('M65 73 C91 80 88 107 68 108 C55 109 52 95 63 91 C70 88 75 96 68 99', 'none', ink, 15) +
    path('M65 73 C91 80 88 107 68 108 C55 109 52 95 63 91 C70 88 75 96 68 99', 'none', body, 8) +
    path('M42 49 Q25 56 37 70 L49 62 Z M86 49 Q103 56 91 70 L79 62 Z', '#d4e8bf', ink, 4) +
    path(`M55 42 L55 ${19 + recoil} Q64 ${13 + recoil} 73 ${19 + recoil} L73 42 Z`, body, ink, 4) +
    `<ellipse cx="64" cy="56" rx="26" ry="27" fill="${body}" stroke="${ink}" stroke-width="4"/>` +
    path(`M53 ${19 + recoil} H75`, 'none', ink, 5) +
    eyes(49, '#568b7e')
  )
}
export function tower(kind, frame = 0) {
  const y =
    kind === 'octopus' || kind === 'mortar'
      ? 76
      : kind === 'seahorse'
        ? 56
        : kind === 'flame' || kind === 'laser'
          ? 72
          : 64
  return (
    `<ellipse cx="64" cy="${y + 6}" rx="29" ry="25" fill="#526e64" opacity=".10"/>` +
    baseTower(kind, frame) +
    `<path d="M43 ${y - 9} Q45 ${y - 20} 54 ${y - 23}" fill="none" stroke="#fff9ee" stroke-width="2.5" opacity=".65"/>`
  )
}
export function monster(kind, frame = 0) {
  if (kind === 'abyss') {
    const t = [0, 2, -2, 0][frame],
      ink = '#658f94'
    let legs = ''
    for (const side of [-1, 1])
      for (let n = 0; n < 4; n++)
        legs += path(
          `M${64 + side * 24} ${43 + n * 12} Q${64 + side * 44} ${45 + n * 12 + t * (n % 2 ? 1 : -1)} ${64 + side * 40} ${56 + n * 12}`,
          'none',
          ink,
          5,
        )
    return (
      legs +
      path(
        `M40 82 Q${15 - t} 79 20 101 Q29 115 45 96 L32 98 Z M88 82 Q${113 + t} 79 108 101 Q99 115 83 96 L96 98 Z`,
        '#a7d4cb',
        ink,
        4,
      ) +
      '<ellipse cx="64" cy="86" rx="22" ry="19" fill="#a7d4cb" stroke="#658f94" stroke-width="4"/>' +
      path('M35 80 C9 64 22 23 56 20 C82 6 110 28 104 53 Q108 79 80 85 Z', '#c7dfd3', ink, 4) +
      path(
        'M82 54 C86 26 39 24 35 53 C29 81 77 88 84 60 C90 40 55 31 48 52 C43 67 68 77 73 61 C76 49 60 47 58 57',
        'none',
        '#84b5b5',
        5,
      ) +
      path('M42 23 L44 13 L55 19 L64 9 L73 19 L84 13 L86 26', '#ead49b', '#b6a373', 2.5) +
      circle(64, 17, 3, '#f8efca', 'none', 0) +
      eyes(94, ink, 54, 20)
    )
  }
  if (kind === 'swift') return shrimp(frame)
  if (kind === 'healer') return snail(frame)
  if (['crab', 'armored', 'boss'].includes(kind)) return crab(frame, kind)
  const t = [0, 2, -2, 0][frame]
  if (kind === 'swarm') {
    const ink = '#81a9b2'
    let tails = ''
    for (const x of [44, 57, 70, 83])
      tails += path(`M${x} 48 Q${x - 6 + t} 35 ${x + 3 + t} 24`, 'none', ink, 4)
    return (
      tails +
      `<ellipse cx="64" cy="67" rx="29" ry="28" fill="#c4e0e3" stroke="${ink}" stroke-width="4"/>` +
      eyes(78, ink)
    )
  }
  if (kind === 'shield') {
    const ink = '#8da7c0'
    return (
      path(`M48 78 Q${42 + t} 98 53 103 H75 Q${86 - t} 98 80 78 Z`, '#c7d7dc', ink, 4) +
      circle(64, 57, 31, '#d7e3ef', ink, 4) +
      path('M64 81 L44 40 M64 81 V29 M64 81 L84 40', 'none', '#b3c7da', 3) +
      eyes(91, ink)
    )
  }
  if (kind === 'rusher') {
    const ink = '#b39a72'
    let spikes = ''
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      spikes += path(
        `M${64 + Math.cos(a) * 25} ${65 + Math.sin(a) * 25} L${64 + Math.cos(a) * 36} ${65 + Math.sin(a) * 36}`,
        'none',
        ink,
        4,
      )
    }
    return (
      path(`M64 37 Q${44 + t} 24 52 18 L64 26 L76 18 Q${84 - t} 24 64 37 Z`, '#e8d7ac', ink, 4) +
      spikes +
      circle(64, 65, 28, '#ead8aa', ink, 4) +
      eyes(76, ink)
    )
  }
  if (kind === 'splitter' || kind === 'mini') {
    const ink = '#b58697',
      fill = kind === 'mini' ? '#f0d2d1' : '#e4b5c6'
    return (
      path(
        `M64 26 Q72 27 78 48 L101 ${49 + t} Q110 56 89 73 L94 98 Q88 108 65 90 L42 102 Q29 101 39 77 L20 ${64 - t} Q17 53 45 51 L54 29 Q59 25 64 26 Z`,
        fill,
        ink,
        4,
      ) + eyes(65, ink)
    )
  }
  const ink = '#8f7cae'
  let arms = ''
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      r = 43 + t * (i % 2 ? 1 : -1)
    arms +=
      path(
        `M${64 + Math.cos(a) * 23} ${64 + Math.sin(a) * 23} Q${64 + Math.cos(a + 0.2) * r} ${64 + Math.sin(a + 0.2) * r} ${64 + Math.cos(a) * r} ${64 + Math.sin(a) * r}`,
        'none',
        ink,
        12,
      ) +
      path(
        `M${64 + Math.cos(a) * 23} ${64 + Math.sin(a) * 23} Q${64 + Math.cos(a + 0.2) * r} ${64 + Math.sin(a + 0.2) * r} ${64 + Math.cos(a) * r} ${64 + Math.sin(a) * r}`,
        'none',
        '#c9b7de',
        6,
      )
  }
  return (
    arms +
    circle(64, 64, 31, '#d2c1e3', ink, 4) +
    circle(64, 43, 6, '#e8d498', ink, 2) +
    circle(50, 47, 4, '#e8d498') +
    circle(78, 47, 4, '#e8d498') +
    eyes(73, ink)
  )
}
export function crab(frame, kind) {
  const t = [0, 2, -2, 0][frame],
    armored = kind === 'armored',
    boss = kind === 'boss'
  const ink = armored ? '#847b9f' : '#ae7e79',
    body = armored ? '#c2b9dc' : boss ? '#e8a9aa' : '#eab6aa'
  let limbs = ''
  for (const side of [-1, 1])
    for (let n = 0; n < 3; n++)
      limbs += path(
        `M${64 + side * 23} ${48 + n * 12} Q${64 + side * 39} ${47 + n * 12 + t * (n % 2 ? 1 : -1)} ${64 + side * 38} ${60 + n * 12 + t * (n % 2 ? 1 : -1)}`,
        'none',
        ink,
        6,
      )
  limbs += path(
    `M43 77 Q22 ${78 + t} 30 97 Q41 105 48 90 L39 91 L43 82 Z M85 77 Q106 ${78 - t} 98 97 Q87 105 80 90 L89 91 L85 82 Z`,
    body,
    ink,
    4,
  )
  const shell =
    kind === 'crab'
      ? circle(64, 60, 29, '#f0dabc', '#b49e7c', 4) +
        path(
          'M77 59 C77 39 49 41 49 59 C49 74 73 77 75 61 C76 51 60 48 58 58 C57 64 66 67 68 60',
          'none',
          '#c4ab86',
          3,
        )
      : path('M64 30 Q86 30 94 49 L91 72 Q64 92 37 72 L34 49 Q42 30 64 30 Z', body, ink, 4) +
        path('M47 47 Q64 36 81 47 L78 67 Q64 76 50 67 Z', armored ? '#d6cee7' : '#f1c3b7', ink, 3)
  const crest = boss
    ? circle(52, 51, 4, '#e6c67f') + circle(64, 46, 5, '#e6c67f') + circle(76, 51, 4, '#e6c67f')
    : ''
  return (
    limbs +
    `<ellipse cx="64" cy="81" rx="19" ry="14" fill="${body}" stroke="${ink}" stroke-width="4"/>` +
    shell +
    crest +
    eyes(86, ink, 56, 16)
  )
}
export function shrimp(frame) {
  const t = [0, 2, -2, 0][frame],
    ink = '#7da995'
  let legs = ''
  for (const side of [-1, 1])
    for (let n = 0; n < 3; n++)
      legs += path(
        `M${64 + side * 10} ${48 + n * 12} Q${64 + side * 24} ${52 + n * 12 + t} ${64 + side * 24} ${61 + n * 12 + t}`,
        'none',
        ink,
        4,
      )
  return (
    legs +
    path('M64 34 Q42 24 49 18 Q58 14 64 27 Q70 14 79 18 Q86 24 64 34 Z', '#c7deb7', ink, 4) +
    path('M58 34 Q48 52 51 76 Q52 96 64 98 Q76 96 77 76 Q80 52 70 34 Z', '#b8d9c1', ink, 4) +
    path('M53 50 H75 M51 65 H77', 'none', '#97bea6', 3) +
    path(
      `M58 94 Q${53 + t} 107 ${43 + t} 108 M70 94 Q${75 - t} 107 ${85 - t} 108`,
      'none',
      ink,
      3,
    ) +
    eyes(85, '#6a9580', 58, 12)
  )
}
export function snail(frame) {
  const t = [0, 2, -2, 0][frame]
  return (
    `<ellipse cx="64" cy="75" rx="22" ry="28" fill="#e8d1a7" stroke="#b6a084" stroke-width="4"/>` +
    path(`M54 94 L${48 + t} 108 M74 94 L${80 - t} 108`, 'none', '#b6a084', 4) +
    circle(48 + t, 108, 3, '#9b916f') +
    circle(80 - t, 108, 3, '#9b916f') +
    circle(64, 57, 29, '#ede0d5', '#baa99b', 4) +
    path(
      'M79 56 C79 36 49 38 49 56 C49 74 75 77 77 59 C78 47 59 44 57 55 C56 64 68 67 70 58',
      'none',
      '#c6b3a4',
      3,
    )
  )
}
