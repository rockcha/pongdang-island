import { expect, it } from 'vitest'
import {
  ladderDisplayRun,
  ladderRoute,
  ladderModes,
  practiceLadder,
} from '@/features/arcade/ladder-model'
it('keeps preview endpoints fixed while preserving every server lane payout', () => {
  for (const mode of Object.keys(ladderModes) as (keyof typeof ladderModes)[]) {
    for (let n = 0; n < 30; n++) {
      const original = practiceLadder({ operation: 'display', mode, stake: 100, choice: n % 6 })
      const displayed = ladderDisplayRun(original)
      expect(displayed.payouts).toEqual(ladderModes[mode].payouts)
      expect(displayed.reward).toBe(original.reward)
      for (let choice = 0; choice < 6; choice++) {
        const before = ladderRoute(choice, original.bridges).destination
        const after = ladderRoute(choice, displayed.bridges).destination
        expect(displayed.payouts[after]).toBe(original.payouts[before])
      }
    }
  }
})
it('preserves all six endpoints for every bridge row including empty rows', () => {
  for (const bridge of [-1, 0, 1, 2, 3, 4]) {
    const destinations = [0, 1, 2, 3, 4, 5].map(
      (choice) => ladderRoute(choice, Array(12).fill(bridge)).destination,
    )
    expect(destinations.toSorted()).toEqual([0, 1, 2, 3, 4, 5])
  }
  expect(ladderRoute(0, [-1]).destination).toBe(0)
  expect(ladderRoute(0, [0, 1, 2]).destination).toBe(3)
})
it('keeps every mode at 100 percent expected payout and pays integral gold', () => {
  for (const [mode, config] of Object.entries(ladderModes)) {
    expect(config.payouts.reduce((a, b) => a + b, 0) / 6).toBe(100)
    for (let stake = 20; stake <= 1000; stake += 20) {
      const rewards = config.payouts.map((payout) => (stake * payout) / 100)
      expect(rewards.every(Number.isInteger)).toBe(true)
      expect(rewards.reduce((a, b) => a + b, 0) / 6).toBe(stake)
    }
    const run = practiceLadder(
      { operation: 'practice', mode: mode as keyof typeof ladderModes, stake: 20, choice: 0 },
      () => 0.3,
    )
    expect(run.destination).toBe(ladderRoute(run.choice, run.bridges).destination)
    expect(run.reward).toBe((20 * run.payouts[run.destination]) / 100)
    expect(Number.isInteger(run.reward)).toBe(true)
  }
})
it('preserves the original four-lane receipt route and payouts', () => {
  const original = {
    id: 'legacy',
    operation_id: 'legacy',
    mode: 'wave' as const,
    stake: 100,
    choice: 3,
    bridges: Array(12).fill(-1),
    payouts: [200, 0, 150, 50],
    destination: 3,
    reward: 50,
  }
  const display = ladderDisplayRun(original)
  expect(display.payouts).toHaveLength(4)
  expect(display.reward).toBe(50)
  for (let choice = 0; choice < 4; choice++) {
    expect(display.payouts[ladderRoute(choice, display.bridges, 4).destination]).toBe(
      original.payouts[choice],
    )
  }
})
