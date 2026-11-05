import { expect, it } from 'vitest'
import {
  createCountingGame,
  countingReducer as reduce,
  answerOrder,
  countKind,
  swimmerPosition,
  type CountingState,
} from '@/features/arcade/calculation-model'
function solve(state: CountingState) {
  for (const [i, k] of answerOrder(state.rounds[state.round]).entries())
    state = reduce(state, { type: 'move', from: state.order.indexOf(k), to: i })
  return reduce(state, { type: 'submit' })
}
it('creates 30 rounds with four unique targets, no ties and shuffled starting answers', () => {
  for (let n = 0; n < 25; n++) {
    const s = createCountingGame()
    expect(s.rounds).toHaveLength(30)
    for (const r of s.rounds) {
      expect(r.targets).toHaveLength(4)
      expect(new Set(r.targets.map((k) => countKind(r, k))).size).toBe(4)
      expect(r.duration).toBe(20000)
      expect([...r.initialOrder].sort()).toEqual([...r.targets].sort())
      expect(r.initialOrder).not.toEqual(answerOrder(r))
    }
    expect(s.rounds[28].fish.length).toBeGreaterThan(s.rounds[0].fish.length)
  }
})
it('preserves target species across two questions', () => {
  const s = createCountingGame()
  for (let i = 0; i < 30; i += 2) expect(s.rounds[i].targets).toEqual(s.rounds[i + 1].targets)
})
it('late stages have one-creature gaps', () => {
  for (const r of createCountingGame().rounds.filter((r) => r.stage >= 13)) {
    const a = answerOrder(r).map((k) => countKind(r, k))
    expect(a[0] - a[1]).toBe(1)
    expect(a[1] - a[2]).toBe(1)
    expect(a[2] - a[3]).toBe(1)
  }
})
it('starts immediately, permits insert and swap without changing population', () => {
  let s = createCountingGame()
  const before = s.rounds
  s = reduce(s, { type: 'start' })
  expect(s.remaining).toBe(20000)
  const initial = [...s.order]
  s = reduce(s, { type: 'move', from: 0, to: 3 })
  expect(s.order).toEqual([...initial.slice(1), initial[0]])
  s = reduce(s, { type: 'swap', from: 0, to: 2 })
  expect(s.order[2]).toBe(initial[1])
  expect(s.rounds).toBe(before)
  expect(reduce(s, { type: 'move', from: 0, to: 9 })).toBe(s)
})
it('rejects sorting after timeout and deducts only one life', () => {
  let s = reduce(createCountingGame(), { type: 'start' })
  s = reduce(s, { type: 'tick', elapsed: 20000 })
  expect(s.outcome).toBe('timeout')
  expect(s.lives).toBe(2)
  expect(reduce(s, { type: 'swap', from: 0, to: 1 })).toBe(s)
  expect(reduce(s, { type: 'submit' })).toBe(s)
})
it('scores full ordered answers and waits for acknowledgement', () => {
  let s = createCountingGame()
  for (let i = 0; i < 30; i++) {
    s = reduce(s, { type: 'start' })
    s = solve(s)
    expect(s.outcome).toBe('correct')
    expect(reduce(s, { type: 'tick', elapsed: 99999 })).toBe(s)
    s = reduce(s, { type: 'next' })
  }
  expect(s.phase).toBe('result')
  expect(s.correct).toBe(30)
  expect(s.score).toBe(4500)
})
it('a wrong permutation loses a life; last-stage practice ends after two rounds', () => {
  let s = reduce(createCountingGame(Math.random, 15), { type: 'start' })
  s = reduce(s, { type: 'submit' })
  expect(s.outcome).toBe('wrong')
  expect(s.lives).toBe(2)
  s = reduce(s, { type: 'next' })
  s = reduce(s, { type: 'start' })
  s = solve(s)
  s = reduce(s, { type: 'next' })
  expect(s.phase).toBe('result')
})
it('keeps diagonal travel within tank bounds', () => {
  const f = { kind: 0, lane: 2, phase: 0, duration: 8000, wobble: 1 }
  for (let t = 0; t < 60000; t += 137) {
    const p = swimmerPosition(f, t)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(1)
    expect(p.y).toBeGreaterThan(0)
    expect(p.y).toBeLessThan(1)
  }
})
