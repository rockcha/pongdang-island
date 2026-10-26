import { expect, it } from 'vitest'
import { createShadowPractice } from '@/features/arcade/shadow-practice'
const catalog = ['a', 'b', 'c', 'd'].map((id) => ({
  id,
  name: id,
  kind: 'fish',
  thumbnail_path: id + '.png',
}))
it('uses every distinct catalog target once, exceeds 100 and stops at catalog exhaustion', () => {
  const expanded = Array.from({ length: 105 }, (_, i) => ({
    id: String(i),
    name: String(i),
    kind: 'fish',
    thumbnail_path: i + '.png',
  }))
  const play = createShadowPractice([
    ...expanded,
    { ...expanded[0], id: 'duplicate' },
    { id: 'map', name: 'map', kind: 'map', thumbnail_path: 'map.png' },
  ])
  const seen = new Set<string>()
  let run = play({ p_action: 'start' }).run!
  for (let i = 0; i < 105; i++) {
    expect(seen.has(run.round.imagePath)).toBe(false)
    seen.add(run.round.imagePath)
    expect(run.round.options.some((o) => o.id === 'map')).toBe(false)
    const correct = run.round.options.find(
      (o) => o.name === run.round.imagePath.replace('.png', ''),
    )!.id
    run = play({ p_action: 'answer', p_round_id: run.round.id, p_choice_id: correct }).run!
    if (i === 99) expect(run.finished).toBe(false)
    if (i < 104) run = play({ p_action: 'next', p_round_id: run.round.id }).run!
  }
  expect(run).toMatchObject({ score: 105, totalQuestions: 105, lives: 3, finished: true })
  expect(play({ p_action: 'next', p_round_id: run.round.id }).run!.score).toBe(105)
  expect(play({ p_action: 'start' }).run).toMatchObject({
    score: 0,
    lives: 3,
    finished: false,
    round: { number: 1 },
  })
})
it('ends practice after three wrong answers and rejects a short pool', () => {
  const play = createShadowPractice(catalog)
  let run = play({ p_action: 'start' }).run!
  for (let i = 0; i < 3; i++) {
    run = play({
      p_action: 'answer',
      p_round_id: run.round.id,
      p_choice_id: run.round.options.find((o) => o.id + '.png' !== run.round.imagePath)!.id,
    }).run!
    if (i < 2) run = play({ p_action: 'next', p_round_id: run.round.id }).run!
  }
  expect(run).toMatchObject({ score: 0, lives: 0, finished: true })
  expect(() => createShadowPractice(catalog.slice(0, 3))).toThrow('SHADOW_POOL_UNAVAILABLE')
})
