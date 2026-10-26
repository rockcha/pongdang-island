import { randomId } from '@/lib/random-id'
import type { OddEvenAction, OddEvenState } from './odd-even-api'
export function createOddEvenPractice(random = Math.random) {
  let state: OddEvenState = { run: null, maxWins: 20 }
  return (action: OddEvenAction): OddEvenState => {
    const r = state.run
    if (action.p_action === 'start')
      state = {
        maxWins: 20,
        run: {
          id: randomId(),
          stake: 30,
          initialStake: 30,
          wins: 0,
          round: 1,
          stage: 'choose',
          pearls: null,
          choice: null,
        },
      }
    else if (r && action.p_run_id === r.id && action.p_round === r.round) {
      if (action.p_action === 'answer' && r.stage === 'choose' && action.p_choice) {
        const pearls = 1 + Math.floor(random() * 10),
          win = (pearls % 2 === 1) === (action.p_choice === 'odd')
        state = {
          ...state,
          run: {
            ...r,
            pearls,
            choice: action.p_choice,
            stake: win ? r.stake * 2 : 0,
            wins: r.wins + (win ? 1 : 0),
            stage: win ? 'decision' : 'lost',
          },
        }
      }
      if (action.p_action === 'double' && r.stage === 'decision' && r.wins < 20)
        state = {
          ...state,
          run: { ...r, stage: 'choose', round: r.round + 1, pearls: null, choice: null },
        }
      if (action.p_action === 'cashout' && r.stage === 'decision')
        state = { ...state, run: { ...r, stage: 'banked' } }
    }
    return structuredClone(state)
  }
}
