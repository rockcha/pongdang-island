import {useState} from 'react'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AdventureRoom} from '@/features/exploration/adventure-room'
import {createRoomVisit,type AdventureRoomId} from '@/features/exploration/adventure-rooms'
import {newPractice} from '@/features/exploration/practice-state'
afterEach(()=>{cleanup();vi.restoreAllMocks()})
function show(id:AdventureRoomId){
 const initial={...newPractice(()=>0),hp:60,mp:20,market:{...newPractice(()=>0).market,floor:12}},visit=createRoomVisit(id,initial,'one',()=>0)
 const descend=vi.fn(),gold=vi.fn()
 function Harness(){const [state,onChange]=useState(initial);return <><output aria-label="resources">{state.hp}/{state.mp}/{state.gold}</output><AdventureRoom visit={visit} state={state} onChange={onChange} onTalk={()=>{}} onDescend={descend} onEncounter={()=>{}} onLoot={()=>{}} onGold={gold}/></>}
 render(<Harness/>);return {descend,gold}
}
it('accepts a lantern once and leaves only the descent action',()=>{
 show('soul-lantern');fireEvent.click(screen.getByRole('button',{name:'등불을 켠다 · 최대 마나 −10'}))
 expect(screen.queryByRole('button',{name:/등불을 켠다/})).toBeNull()
 expect(screen.getByRole('button',{name:'아래층으로 내려간다.'})).toBeTruthy()
})
it('lets the player pass a well or trade mana for health',()=>{
 const {descend}=show('deep-well');fireEvent.click(screen.getByRole('button',{name:'그냥 지나간다'}));expect(descend).toHaveBeenCalledTimes(1)
 expect(screen.getByLabelText('resources').textContent).toBe('60/20/100000')
 fireEvent.click(screen.getByRole('button',{name:'물을 마신다 · 체력 전부 회복 / 마나 0'}))
 expect(screen.getByLabelText('resources').textContent).toBe('100/0/100000')
})
it('shows the random spell obtained for the forbidden trade',()=>{
 show('forbidden-trade');fireEvent.click(screen.getByRole('button',{name:'피를 바친다 · 체력 −50'}))
 expect(screen.getByLabelText('resources').textContent).toBe('10/20/100000')
 expect(screen.getByRole('status',{name:'아이템 획득'}).querySelector('img')).toBeTruthy()
 expect(screen.queryByRole('button',{name:/피를 바친다/})).toBeNull()
})
it('presents the gem price and awards gold exactly once',()=>{
 const {gold}=show('cursed-gem-eye');vi.spyOn(Math,'random').mockReturnValue(.1);fireEvent.click(screen.getByRole('button',{name:'보석을 뽑는다 · 골드 +500 또는 마나 −20 (각 50%)'}))
 expect(screen.getByLabelText('resources').textContent).toBe('60/20/100500')
 expect(gold).toHaveBeenCalledTimes(1);expect(screen.getByRole('status',{name:'골드 획득'})).toBeTruthy()
})
it('pays for a safe three-floor transfer and shows its destination',()=>{
 show('broken-teleport');fireEvent.click(screen.getByRole('button',{name:'골드 200을 넣는다 · 지하 15층으로'}))
 expect(screen.getByLabelText('resources').textContent).toBe('60/20/99800')
 expect(screen.getByRole('button',{name:'지하 15층으로 이동한다'})).toBeTruthy()
})

it('shows only the mana-loss result and never plays a gold reward on failure',()=>{
 const {gold}=show('cursed-gem-eye'),random=vi.spyOn(Math,'random').mockReturnValue(.9)
 const button=screen.getByRole('button',{name:'보석을 뽑는다 · 골드 +500 또는 마나 −20 (각 50%)'})
 expect(screen.getAllByText(/확률 50%/)).toHaveLength(2)
 fireEvent.click(button)
 expect(screen.getByLabelText('resources').textContent).toBe('60/0/100000')
 expect(screen.getByRole('status',{name:'마나 감소'}).textContent).toContain('마나 −20')
 expect(screen.queryByRole('status',{name:'골드 획득'})).toBeNull();expect(gold).not.toHaveBeenCalled()
 expect(screen.getByLabelText('방 효과').textContent).not.toContain('+500');expect(screen.getByLabelText('방 효과').textContent).not.toContain('50%')
 fireEvent.click(button);expect(random).toHaveBeenCalledTimes(1)
})
