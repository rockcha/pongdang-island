import { expect, it } from 'vitest'
import { ladderRoute, ladderModes, practiceLadder } from '@/features/arcade/ladder-model'
it('preserves all four endpoints for every bridge row including empty rows', () => {
  for (const bridge of [-1,0,1,2]) {
    const destinations = [0,1,2,3].map(choice => ladderRoute(choice, Array(12).fill(bridge)).destination)
    expect(destinations.toSorted()).toEqual([0,1,2,3])
  }
  expect(ladderRoute(0, [-1]).destination).toBe(0)
  expect(ladderRoute(0, [0,1,2]).destination).toBe(3)
})
it('keeps every mode at 100 percent expected payout and pays integral gold', () => {
  for (const [mode, config] of Object.entries(ladderModes)) {
    expect(config.payouts.reduce((a,b) => a+b,0)/4).toBe(100)
    const run = practiceLadder({ operation:'practice',mode:mode as keyof typeof ladderModes,stake:20,choice:0 }, () => .3)
    expect(run.destination).toBe(ladderRoute(run.choice,run.bridges).destination)
    expect(run.reward).toBe(20*run.payouts[run.destination]/100)
    expect(Number.isInteger(run.reward)).toBe(true)
  }
})
