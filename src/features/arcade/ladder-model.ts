export const ladderModes = {
  calm: { name: '잔잔한 물결', detail: '안정형', payouts: [50, 75, 125, 150] },
  wave: { name: '출렁이는 파도', detail: '균형형', payouts: [0, 50, 150, 200] },
  storm: { name: '거친 폭풍', detail: '불방형', payouts: [0, 0, 0, 400] },
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
export function ladderRoute(choice: number, bridges: number[]) {
  let col = choice
  const points: [number, number][] = [[45 + col * 90, 20]]
  bridges.forEach((link, row) => {
    const y = 40 + row * 12
    points.push([45 + col * 90, y])
    if (link >= 0) {
      if (link === col) col++
      else if (link === col - 1) col--
    }
    points.push([45 + col * 90, y])
  })
  points.push([45 + col * 90, 202])
  return {
    destination: col,
    path: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' '),
  }
}
export function practiceLadder(bet: LadderBet, random = Math.random): LadderRun {
  const payouts: number[] = [...ladderModes[bet.mode].payouts]
  for (let i = payouts.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[payouts[i], payouts[j]] = [payouts[j], payouts[i]]
  }
  const bridges = Array.from({ length: 12 }, () => Math.floor(random() * 4) - 1)
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
