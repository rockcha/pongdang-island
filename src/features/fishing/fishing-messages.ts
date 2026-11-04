import {fishBehavior,fishingBiteSeconds} from './tension-game'
import type {TensionGame} from './tension-game'
import {fishingMessagePools,type FishingMessageState} from './fishing-message-pools'

const lost = [
  '아쉽게 놓쳤어요',
  '꼬리만 남기고 떠났어요',
  '물결 너머로 사라졌어요',
  '다음 만남을 기약해요',
  '바닷속으로 쏙 사라졌어요',
  '조금 아쉬운 만남이었어요',
  '물속이 다시 조용해졌어요',
  '다음에는 만날 수 있겠죠?',
  '빈 낚싯줄이 돌아왔어요',
  '이번 손님은 먼저 돌아갔어요',
  '물방울만 반짝 남았어요',
  '조금만 더 가까웠더라면…',
  '다음 손님을 기다려봐요',
  '바다가 다시 잔잔해졌어요',
  '아쉬움은 물결에 흘려보내요',
  '다음엔 꼭 만나요!',
]

// Seeded presentation only. A coprime stride visits every line before repeating
// within one state's cycles, without gameplay RNG, timers or shared mutable state.
function choose(pool:readonly string[],seed:number,cycle:number,salt=0){
 let hash=seed^Math.imul(salt+1,0x9e3779b9)
 hash=Math.imul(hash^(hash>>>16),0x85ebca6b)
 hash=Math.imul(hash^(hash>>>13),0xc2b2ae35)
 hash=(hash^(hash>>>16))>>>0
 const steps=[1,7,11,13,17,19,23,29]
 const step=pool.length===30?steps[(hash>>>8)%steps.length]:1
 return pool[(hash%pool.length+cycle*step)%pool.length]
}
const salts:Record<FishingMessageState,number>={approach:1,calm:2,warning:3,surge:4,recover:5}
export function fishingMessage(game:TensionGame):string{
 if(game.phase==='waiting'||game.phase==='won')return ''
 if(game.phase==='lost')return choose(lost,game.seed,0)
 const behavior=fishBehavior(game.time,game.seed,game.rarity)
 const cycle=Math.max(0,Math.floor(behavior.index/2))
 let state:FishingMessageState
 if(behavior.index===-1){
  state=game.time<fishingBiteSeconds(game.seed)*.6?'approach':'warning'
 }else if(behavior.mood==='recover'){
  // Both describe the same existing low-force interval. Alternate the wording
  // family by cast/cycle, keeping one readable message for the entire interval.
  state=((game.seed+cycle)&1)===0?'recover':'calm'
 }else state=behavior.mood
 const stateCycle=behavior.mood==='recover'&&behavior.index!==-1?Math.floor(cycle/2):cycle
 return choose(fishingMessagePools[game.rarity][state],game.seed,stateCycle,salts[state])
}
