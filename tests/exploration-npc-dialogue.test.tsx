import {StrictMode} from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {kasim,npcDialogue,npcFarewellDelay,npcLineText,pickNpcLine} from '@/features/exploration/npc-dialogue'
import {useNpcConversation} from '@/features/exploration/use-npc-conversation'

afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
it('offers distinct randomized lines for buying, learning and both farewells without consecutive repeats',()=>{
 for(const lines of Object.values(npcDialogue)){
  expect(lines.length).toBeGreaterThanOrEqual(5)
  expect(new Set(lines).size).toBe(lines.length)
  lines.forEach((line,index)=>expect(pickNpcLine(lines,undefined,()=>index/lines.length)).toBe(line))
  let previous:string|undefined
  for(let index=0;index<20;index++){const next=pickNpcLine(lines,previous,()=>0);expect(next).not.toBe(previous);previous=next}
 }
})
it('removes NPC speaker labels from old lines while keeping player and other logs intact',()=>{
 expect(npcLineText('떠도는 사막 주술사: “주문을 익혔군.”')).toBe('주문을 익혔군.')
 expect(npcLineText('귀환 상인 카심: “좋은 선택일세.”')).toBe('좋은 선택일세.')
 expect(npcLineText('카심: 잘 챙겨 가게.')).toBe('잘 챙겨 가게.')
 expect(npcLineText('퐁이: 이 방은 뭐지?')).toBe('퐁이: 이 방은 뭐지?')
 expect(npcLineText('체력 18 회복')).toBe('체력 18 회복')
})
it('greets once in StrictMode, varies reactions, then allows the farewell to be read before descending once',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
 const talk=vi.fn(),descend=vi.fn()
 function Harness(){const npc=useNpcConversation(kasim.greeting,talk,descend);return <><p>{npc.reply}</p><button onClick={()=>npc.say(npcDialogue.merchantPurchase)}>구매</button><button onClick={()=>npc.depart(npcDialogue.merchantFarewell)}>내려가기</button></>}
 render(<StrictMode><Harness/></StrictMode>);expect(talk).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByRole('button',{name:'구매'}));const first=talk.mock.lastCall![0]
 fireEvent.click(screen.getByRole('button',{name:'구매'}));expect(talk.mock.lastCall![0]).not.toBe(first)
 fireEvent.click(screen.getByRole('button',{name:'내려가기'}));fireEvent.click(screen.getByRole('button',{name:'내려가기'}))
 const farewell=talk.mock.lastCall![0];expect(npcDialogue.merchantFarewell).toContain(farewell)
 expect(talk).toHaveBeenCalledTimes(4)
 await act(async()=>{await vi.advanceTimersByTimeAsync(npcFarewellDelay(farewell)-1)})
 expect(descend).not.toHaveBeenCalled()
 await act(async()=>{await vi.advanceTimersByTimeAsync(1)})
 expect(descend).toHaveBeenCalledTimes(1)
})
it('cancels a pending farewell descent when the room unmounts',async()=>{
 vi.useFakeTimers();const descend=vi.fn()
 function Harness(){const npc=useNpcConversation('어서 오게.',()=>{},descend);return <button onClick={()=>npc.depart(npcDialogue.shamanFarewell)}>떠나기</button>}
 const view=render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'떠나기'}));view.unmount()
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000)})
 expect(descend).not.toHaveBeenCalled()
})
