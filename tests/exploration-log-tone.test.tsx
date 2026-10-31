import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {ChoiceLog} from '@/features/exploration/choice-log'
import type {CombatEvent} from '@/features/exploration/combat-state'
afterEach(cleanup)
it('marks incoming harm red while leaving outgoing damage and recovery neutral',()=>{
 const events:CombatEvent[]=[
  {kind:'status',effect:'blind',text:'실명!'},
  {kind:'status',effect:'weaken',text:'약화'},
  {kind:'status',effect:'magic-break',text:'마저 감소'},
  {kind:'status',effect:'mana-drain',text:'마나 감소'},
  {kind:'status',target:'player',effect:'bleed',text:'출혈'},
  {kind:'monster',damage:12,text:'피격'},
  {kind:'player',damage:12,text:'공격'},
  {kind:'player',healing:30,text:'회복'},
  {kind:'status',damage:3,text:'적 출혈'},
 ]
 for(const [index,event] of events.entries()){
  const view=render(<ChoiceLog text={event.text} event={event}/>)
  expect(screen.getByRole('status').getAttribute('data-harmful')).toBe(index<6?'true':null)
  view.unmount()
 }
})
