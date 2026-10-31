import {useState} from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MonsterMoveDetails} from '@/features/exploration/monster-move-details'
import {getMonster} from '@/features/exploration/monster-catalog'
import {AdventureRoom} from '@/features/exploration/adventure-room'
import {createRoomVisit} from '@/features/exploration/adventure-rooms'
import {newPractice,type PracticeState} from '@/features/exploration/practice-state'
afterEach(()=>{cleanup();vi.useRealTimers()})
it('separates spell flavor from live damage, blind effect and casting rules',()=>{
 const monster=getMonster('treasure-scarab')
 render(<MonsterMoveDetails monster={monster} kind="sealed-flash"/>)
 expect(document.querySelector('.exploration-move-intro p')?.textContent).not.toContain('30%')
 const facts=screen.getAllByRole('definition')[0].closest('dl')!
 expect(facts.textContent).toContain('12');expect(facts.textContent).toContain('명중률 −30%')
 expect(facts.textContent).toContain('다음 기본 공격 1회');expect(facts.textContent).toContain('50%')
 expect(facts.textContent).toContain('마법 저항력');expect(facts.textContent).toContain('회피와 치명타 없음')
})
it('shows physical damage variance and critical chance separately',()=>{
 render(<MonsterMoveDetails monster={getMonster('sand-scorpion')} kind="basic"/>)
 expect(screen.getByText('5–9')).toBeTruthy();expect(screen.getByText('5%')).toBeTruthy()
 expect(screen.getByText('방어력')).toBeTruthy()
})
function restRoom(initial:PracticeState){
 const visit=createRoomVisit('rest-camp',initial,'rest',()=>0)
 function Harness(){const [state,onChange]=useState(initial);return <AdventureRoom visit={visit} state={state} onChange={onChange} onTalk={()=>{}} onDescend={()=>{}} onEncounter={()=>{}} onLoot={()=>{}} onGold={()=>{}}/>}
 render(<Harness/>)
}
it('animates actual HP and MP gains once, retains the result facts, and clears the temporary effect',async()=>{
 vi.useFakeTimers();restRoom({...newPractice(()=>0),hp:60,mp:20})
 expect(screen.queryByRole('status',{name:'회복 완료'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'쉬었다 간다 · 체력·마나 전부 회복'}))
 const feedback=screen.getByRole('status',{name:'회복 완료'})
 expect(feedback.textContent).toContain('체력 +40');expect(feedback.textContent).toContain('마나 +20')
 expect(screen.queryByRole('button',{name:/쉬었다 간다/})).toBeNull()
 await act(async()=>{await vi.advanceTimersByTimeAsync(1800)})
 expect(screen.queryByRole('status',{name:'회복 완료'})).toBeNull()
 expect(document.querySelector('dl[aria-label="방 효과"]')?.textContent).toContain('+40')
})
it('uses the reduced mana maximum and avoids a false positive gain when already full',()=>{
 restRoom({...newPractice(()=>0),hp:100,mp:30,maxManaSacrifice:10,soulLantern:'ready'})
 fireEvent.click(screen.getByRole('button',{name:/쉬었다 간다/}))
 const feedback=screen.getByRole('status',{name:'회복 완료'})
 expect(feedback.textContent).toContain('가득 찼습니다');expect(feedback.textContent).not.toContain('+0')
})
