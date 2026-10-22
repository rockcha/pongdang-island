export const LADDER_TRAVEL_MS = 6000
export const LADDER_WIPE_MS = 1100
export const LADDER_REVEAL_MS = LADDER_WIPE_MS + LADDER_TRAVEL_MS + 300

export const ladderModes = {
  calm: {
    name: '조개 줍는 해변',
    detail: '꽝 없이 소소하게 챙겨요',
    image: '/arcade/ladder/modes/calm.png',
    payouts: [70, 80, 90, 100, 120, 140],
  },
  wave: {
    name: '순풍의 뱃길',
    detail: '손실·본전·당첨이 골고루',
    image: '/arcade/ladder/modes/wave.png',
    payouts: [0, 50, 80, 100, 150, 220],
  },
  lucky: {
    name: '풍어의 물결',
    detail: '여섯 길 중 네 길에서 이득',
    image: '/arcade/ladder/modes/lucky.png',
    payouts: [0, 20, 120, 130, 150, 180],
  },
  shark: {
    name: '상어의 해협',
    detail: '거친 물살 너머 최대 4배',
    image: '/arcade/ladder/modes/shark.png',
    payouts: [0, 0, 0, 50, 150, 400],
  },
  storm: {
    name: '용왕의 보물고',
    detail: '여섯 길 중 하나, 보물은 6배',
    image: '/arcade/ladder/modes/storm.png',
    payouts: [0, 0, 0, 0, 0, 600],
  },
} as const
export type LadderMode = keyof typeof ladderModes
export type LadderRun = {
  id: string
  operation_id: string
  mode: LadderMode
  stake: number
  choice: number
  bridges: number[]
  payouts: number[]
  destination: number
  reward: number
}
export type LadderBet = { operation: string; mode: LadderMode; stake: number; choice: number }
export function ladderRoute(choice: number, bridges: number[], lanes = 6) {
  let col = choice
  const step = 360 / lanes,
    x = (column: number) => step * (column + 0.5)
  const points: [number, number][] = [[x(col), 20]]
  bridges.forEach((link, row) => {
    const y = 40 + row * (144 / Math.max(1, bridges.length))
    points.push([x(col), y])
    if (link >= 0) {
      if (link === col) col++
      else if (link === col - 1) col--
    }
    points.push([x(col), y])
  })
  points.push([x(col), 202])
  return {
    destination: col,
    path: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' '),
  }
}
// Keep the preview endpoints fixed. Adjacent display bridges permute the server's
// shuffled endpoints without changing the payout reached by any starting lane.
export function ladderDisplayRun(run: LadderRun): LadderRun {
  const payouts = [...run.payouts]
  const bridges = [...run.bridges]
  // Previously settled four-lane bets keep their original endpoints and payout.
  const target =
    run.payouts.length === 4
      ? [...run.payouts].sort((a, b) => a - b)
      : ladderModes[run.mode].payouts
  for (let i = 0; i < target.length; i++) {
    let from = payouts.findIndex((p, index) => index >= i && p === target[i])
    while (from > i) {
      const left = from - 1
      ;[payouts[left], payouts[from]] = [payouts[from], payouts[left]]
      bridges.push(left)
      from--
    }
  }
  return {
    ...run,
    payouts,
    bridges,
    destination: ladderRoute(run.choice, bridges, payouts.length).destination,
  }
}
export function practiceLadder(bet: LadderBet, random = Math.random): LadderRun {
  const payouts: number[] = [...ladderModes[bet.mode].payouts]
  for (let i = payouts.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[payouts[i], payouts[j]] = [payouts[j], payouts[i]]
  }
  const bridges = Array.from({ length: 12 }, () => Math.floor(random() * payouts.length) - 1)
  const destination = ladderRoute(bet.choice, bridges).destination
  return {
    id: bet.operation,
    operation_id: bet.operation,
    ...bet,
    bridges,
    payouts,
    destination,
    reward: (bet.stake * payouts[destination]) / 100,
  }
}
