export const CREATURES = [
  { id: 'mackerel', name: '고등어' },
  { id: 'clownfish', name: '흰동가리' },
  { id: 'pufferfish', name: '복어' },
  { id: 'shark', name: '상어' },
  { id: 'octopus', name: '문어' },
  { id: 'squid', name: '오징어' },
  { id: 'crab', name: '게' },
  { id: 'turtle', name: '바다거북' },
  { id: 'starfish', name: '불가사리' },
  { id: 'jellyfish', name: '해파리' },
] as const
export const STAGE_COUNT = 15
export const ROUND_COUNT = STAGE_COUNT * 2
export type Swimmer = {
  kind: number
  lane: number
  phase: number
  duration: number
  wobble: number
}
export type CountingRound = {
  stage: number
  question: number
  targets: number[]
  initialOrder: number[]
  fish: Swimmer[]
  duration: number
}
export type CountingState = {
  phase: 'briefing' | 'counting' | 'feedback' | 'result'
  rounds: CountingRound[]
  round: number
  firstRound: number
  remaining: number
  order: number[]
  lives: number
  correct: number
  score: number
  outcome: 'correct' | 'wrong' | 'timeout' | null
}
export type CountingAction =
  | { type: 'reset'; state: CountingState }
  | { type: 'tick'; elapsed: number }
  | { type: 'move' | 'swap'; from: number; to: number }
  | { type: 'start' | 'submit' | 'next' }
const countsByStage = [
  [10, 7, 4, 1],
  [11, 8, 5, 2],
  [12, 9, 6, 3],
  [11, 8, 6, 3],
  [12, 9, 7, 4],
  [13, 10, 8, 5],
  [12, 10, 8, 6],
  [13, 11, 9, 7],
  [14, 12, 10, 8],
  [14, 12, 11, 9],
  [15, 13, 12, 10],
  [16, 14, 13, 11],
  [15, 14, 13, 12],
  [16, 15, 14, 13],
  [17, 16, 15, 14],
]
function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
export function createCountingGame(random = Math.random, startStage = 1): CountingState {
  const rounds: CountingRound[] = []
  for (let stage = 1; stage <= STAGE_COUNT; stage++) {
    const order = CREATURES.map((_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    const targets = order.slice(0, 4)
    for (let question = 1; question <= 2; question++) {
      const ranked = shuffle(targets, random)
      const offset = Math.floor(random() * 2)
      const kinds = ranked.flatMap((kind, i) =>
        Array<number>(countsByStage[stage - 1][i] + offset).fill(kind),
      )
      if (stage >= 10) kinds.push(...Array<number>(2).fill(order[4]))
      if (stage >= 13) kinds.push(...Array<number>(2).fill(order[5]))
      const mixed = shuffle(kinds, random)
      let initialOrder = shuffle(targets, random)
      if (initialOrder.every((k, i) => k === ranked[i]))
        initialOrder = [...initialOrder.slice(1), initialOrder[0]]
      const fish = mixed.map((kind, i) => ({
        kind,
        lane: i % 8,
        phase: random() * 2,
        duration: 6500 + random() * 3000,
        wobble: random() * Math.PI * 2,
      }))
      rounds.push({ stage, question, targets, initialOrder, fish, duration: 20000 })
    }
  }
  const firstRound = (Math.max(1, Math.min(STAGE_COUNT, Math.floor(startStage) || 1)) - 1) * 2
  return {
    phase: 'briefing',
    rounds,
    round: firstRound,
    firstRound,
    remaining: 0,
    order: rounds[firstRound].initialOrder,
    lives: 3,
    correct: 0,
    score: 0,
    outcome: null,
  }
}
export function countKind(round: CountingRound, kind: number) {
  return round.fish.filter((f) => f.kind === kind).length
}
export function answerOrder(round: CountingRound) {
  return [...round.targets].sort((a, b) => countKind(round, b) - countKind(round, a))
}
export function answersComplete(state: CountingState) {
  return (
    state.order.length === 4 &&
    new Set(state.order).size === 4 &&
    state.order.every((k) => state.rounds[state.round].targets.includes(k))
  )
}
export function swimmerPosition(fish: Swimmer, elapsed: number) {
  const t = elapsed / fish.duration
  // Continuous wandering introduces occasional turns before reaching the wall.
  const travel = fish.phase + t + 0.28 * Math.sin(t * 5 + fish.wobble)
  const folded = ((travel % 2) + 2) % 2
  const forward = 1 + 1.4 * Math.cos(t * 5 + fish.wobble) >= 0
  const verticalTravel = (fish.lane + 0.5) / 8 + t * (0.45 + fish.wobble / 20)
  const vertical = ((verticalTravel % 2) + 2) % 2
  return {
    x: folded < 1 ? folded : 2 - folded,
    y: 0.04 + 0.92 * (vertical < 1 ? vertical : 2 - vertical),
    right: folded < 1 === forward,
  }
}
function next(state: CountingState): CountingState {
  if (state.lives === 0 || state.round === state.rounds.length - 1)
    return { ...state, phase: 'result', remaining: 0 }
  return {
    ...state,
    phase: 'briefing',
    round: state.round + 1,
    remaining: 0,
    order: state.rounds[state.round + 1].initialOrder,
    outcome: null,
  }
}
function settle(state: CountingState, timeout: boolean): CountingState {
  const round = state.rounds[state.round]
  const correct =
    !timeout && answersComplete(state) && answerOrder(round).every((k, i) => state.order[i] === k)
  return {
    ...state,
    phase: 'feedback',
    remaining: 0,
    outcome: timeout ? 'timeout' : correct ? 'correct' : 'wrong',
    lives: state.lives - Number(!correct),
    correct: state.correct + Number(correct),
    score: state.score + (correct ? 100 + Math.ceil((state.remaining / round.duration) * 50) : 0),
  }
}
export function countingReducer(state: CountingState, action: CountingAction): CountingState {
  if (action.type === 'reset') return action.state
  if (action.type === 'start' && state.phase === 'briefing')
    return { ...state, phase: 'counting', remaining: state.rounds[state.round].duration }
  if (action.type === 'tick') {
    if (!Number.isFinite(action.elapsed) || state.phase !== 'counting') return state
    const remaining = Math.max(0, state.remaining - Math.max(0, action.elapsed))
    if (remaining > 0) return { ...state, remaining }
    return settle({ ...state, remaining: 0 }, true)
  }
  if (action.type === 'next' && state.phase === 'feedback') return next(state)
  if (state.phase !== 'counting') return state
  if (action.type === 'move' || action.type === 'swap') {
    const { from, to } = action
    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 0 ||
      to < 0 ||
      from >= 4 ||
      to >= 4
    )
      return state
    const order = [...state.order]
    if (action.type === 'swap') [order[from], order[to]] = [order[to], order[from]]
    else {
      const [kind] = order.splice(from, 1)
      order.splice(to, 0, kind)
    }
    return { ...state, order }
  }
  if (action.type === 'submit' && answersComplete(state)) return settle(state, false)
  return state
}
