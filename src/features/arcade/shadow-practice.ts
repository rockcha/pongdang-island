import { randomId } from '@/lib/random-id'
import type { ShadowAction, ShadowState } from './shadow-api'
type Item = { id: string; name: string; kind: string; thumbnail_path: string }
export function createShadowPractice(catalog: Item[]) {
  const pool = [
    ...new Map(
      catalog
        .filter((item) => item.kind !== 'map' && item.kind !== 'relic' && item.thumbnail_path)
        .map((item) => [item.name, item]),
    ).values(),
  ]
  if (pool.length < 4) throw new Error('SHADOW_POOL_UNAVAILABLE')
  const used = new Set<string>()
  let current: ShadowState['run'] = null,
    target: Item
  const response = (): ShadowState => ({
    serverNow: new Date().toISOString(),
    run: current ? { ...current, round: { ...current.round } } : null,
  })
  function question() {
    const remaining = pool.filter((item) => !used.has(item.id))
    target = remaining[Math.floor(Math.random() * remaining.length)]
    used.add(target.id)
    const shuffled = pool.filter((item) => item.id !== target.id)
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const choices = [target, ...shuffled.slice(0, 3)]
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[choices[i], choices[j]] = [choices[j], choices[i]]
    }
    return {
      id: randomId(),
      number: (current?.round.number ?? 0) + 1,
      imagePath: target.thumbnail_path,
      options: choices.map(({ id, name }) => ({ id, name })),
      deadline: new Date(Date.now() + 8000).toISOString(),
      answered: false,
      correct: null,
      timedOut: null,
      answerName: null,
    }
  }
  return (action: ShadowAction): ShadowState => {
    if (action.p_action === 'start') {
      current = null
      used.clear()
      current = {
        id: randomId(),
        score: 0,
        totalQuestions: pool.length,
        lives: 3,
        finished: false,
        round: question(),
      }
    }
    if (!current || current.finished || action.p_action === 'state' || action.p_action === 'start')
      return response()
    if (action.p_round_id !== current.round.id) return response()
    if (action.p_action === 'next' && current.round.answered)
      current = { ...current, round: question() }
    if (action.p_action === 'answer' && !current.round.answered) {
      const timedOut = Date.now() >= Date.parse(current.round.deadline)
      const correct = !timedOut && action.p_choice_id === target.id
      if (!action.p_choice_id && !timedOut) return response()
      current = {
        ...current,
        score: current.score + (correct ? 1 : 0),
        lives: current.lives - (correct ? 0 : 1),
        round: { ...current.round, answered: true, correct, timedOut, answerName: target.name },
      }
      current.finished = current.round.number >= pool.length || current.lives === 0
    }
    return response()
  }
}
