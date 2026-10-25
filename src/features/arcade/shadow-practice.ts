import { randomId } from '@/lib/random-id'
import type { ShadowAction, ShadowState } from './shadow-api'
type Item = { id: string; name: string; kind: string; thumbnail_path: string }
export function createShadowPractice(catalog: Item[]) {
  const pool = [
    ...new Map(
      catalog
        .filter((item) => (item.kind!=='map'&&item.kind!=='relic') && item.thumbnail_path)
        .map((item) => [item.name, item]),
    ).values(),
  ]
  if (pool.length < 4) throw new Error('SHADOW_POOL_UNAVAILABLE')
  let current: ShadowState['run'] = null,
    target: Item
  const response = (): ShadowState => ({
    serverNow: new Date().toISOString(),
    run: current ? { ...current, round: { ...current.round } } : null,
  })
  function question() {
    const shuffled = [...pool]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const choices = shuffled.slice(0, 4)
    target = choices[Math.floor(Math.random() * 4)]
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
      current = { id: randomId(), score: 0, lives: 3, finished: false, round: question() }
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
        score: Math.min(100, current.score + (correct ? 1 : 0)),
        lives: current.lives - (correct ? 0 : 1),
        round: { ...current.round, answered: true, correct, timedOut, answerName: target.name },
      }
      current.finished = current.score === 100 || current.lives === 0
    }
    return response()
  }
}
