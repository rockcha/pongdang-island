import type { Rarity } from '@/lib/game/rarity'
import { fishBehavior, fishingBiteSeconds } from './tension-game'
import type { TensionGame } from './tension-game'

const approaching=['검은 그림자가 나타났어요…!','무언가 근처를 서성거려요','물밑에서 움직임이 느껴져요','작은 그림자가 다가와요','미끼 주변을 맴돌고 있어요','누군가 미끼를 살펴봐요','물속에서 반짝 움직였어요','그림자가 찌 아래로 다가와요']
const nibbling=['찌를 툭툭 건드렸어요!','입질이 오기 시작했어요!','미끼를 톡 건드렸어요!','찌가 살짝 잠겼어요!','뭔가 미끼를 물었어요!','톡톡, 입질이 느껴져요!','물고기가 미끼를 탐색해요!','찌 끝이 콕 움직였어요!']
const calm=['살랑살랑 헤엄쳐요','느긋하게 맴돌아요','잠시 얌전해졌어요','물살에 몸을 맡겨요','꼬리를 살살 흔들어요','주변을 두리번거려요','동그랗게 돌아요','천천히 방향을 바꿔요']
const warning=['몸을 움츠려요','꼬리가 씰룩!','휙 돌아볼까?','지느러미를 펼쳐요','몸을 낮추고 있어요','꼬리에 힘을 모아요','갑자기 방향을 틀어요','움직임이 심상치 않아요']
const recover=['잠깐 숨을 골라요','힘이 조금 빠졌어요','천천히 헤엄쳐요','꼬리짓이 잦아들어요','잠시 쉬어가나 봐요','살짝 지친 모양이에요','물결에 둥실 떠요','한숨 돌리고 있어요']
const surge:Record<Rarity,string[]>={
 common:['작은 힘으로 버텨요','가볍게 파닥여요','작아도 제법 당겨요!','꼬마가 고집을 부려요','꼬리를 바삐 흔들어요','요리조리 빠져나가요','작은 꼬리로 팡팡!','쏜살같이 달아나요!'],
 rare:['제법 힘이 센 녀석이에요!','힘차게 꼬리를 쳐요!','쉽게 물러서지 않아요','힘을 모아 다시 당겨요!','물살을 가르며 버텨요','꼬리 한 번에 물결이 출렁!','재빠르게 방향을 틀어요','단단히 버티고 있어요!'],
 epic:['우와, 힘이 센 놈이에요!','묵직하게 잡아당겨요!','끈질기게 버티는 녀석이에요','물보라를 일으켜요!','온몸으로 밀어붙여요!','힘이 좀처럼 줄지 않아요','다시 세차게 몸부림쳐요!','바다를 휘젓고 있어요!'],
 mythic:['엄청난 힘이 느껴져요!','바다를 통째로 당기는 듯해요!','거대한 물살이 밀려와요','끝없는 힘으로 버텨요!','물속이 크게 술렁여요','압도적인 힘으로 당겨요!','깊은 바다가 요동쳐요!','도무지 지칠 줄을 몰라요'],
}
const lost=['아쉽게 놓쳤어요','꼬리만 남기고 떠났어요','물결 너머로 사라졌어요','다음 만남을 기약해요','바닷속으로 쏙 사라졌어요','조금 아쉬운 만남이었어요','물속이 다시 조용해졌어요','다음에는 만날 수 있겠죠?']
// A seeded shuffled walk: stable during one action, visits every phrase before
// repeating, and never consumes gameplay RNG on animation frames.
function choose(pool:string[],seed:number,cycle:number){
 const hash=Math.imul(seed^(seed>>>16),0x45d9f3b)>>>0
 const step=1+2*((hash>>>8)%4)
 return pool[(hash%pool.length+cycle*step)%pool.length]
}
export function fishingMessage(game:TensionGame):string{
 if(game.phase==='waiting')return ''
 if(game.phase==='won')return ''
 if(game.phase==='lost')return choose(lost,game.seed,0)
 const behavior=fishBehavior(game.time,game.seed,game.rarity)
 if(behavior.index===-1)return choose(game.time<fishingBiteSeconds(game.seed)*.6?approaching:nibbling,game.seed,0)
 const pool=behavior.mood==='surge'?surge[game.rarity]:behavior.mood==='warning'?warning:behavior.mood==='recover'?recover:calm
 return choose(pool,game.seed,Math.floor(behavior.index/2))
}
