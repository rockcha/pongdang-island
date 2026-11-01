import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {ChoiceLog} from '@/features/exploration/choice-log'
import type {CombatEvent} from '@/features/exploration/combat-state'
import {CombatResultLog} from '@/features/exploration/combat-result-log'
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

it('emphasizes actual health lost while preserving the complete combat sentence for accessibility',()=>{
 const event:CombatEvent={kind:'monster',moveId:'tail-swipe',damage:5,rawDamage:6,defenseBlocked:1,text:'꼬리치기! 5 피해를 받았습니다.'}
 render(<CombatResultLog event={event} text={event.text} speaker="부적 도마뱀"/>)
 const log=screen.getByRole('status',{name:'탐험 로그'})
 expect(log.getAttribute('data-tone')).toBe('harm')
 expect(log.querySelector('strong')?.textContent).toBe('5 피해')
 expect(log.querySelector('p')?.textContent).toBe('5 피해를 입었습니다.')
 expect(log.querySelector('.sr-only')?.textContent).toBe(`부적 도마뱀: ${event.text}`)
})
it('keeps a missed attack and healing distinct from successful damage',()=>{
 const event:CombatEvent={kind:'player',effect:'miss',damage:0,text:'공격이 빗나갔습니다.'}
 const view=render(<CombatResultLog event={event} text={event.text} speaker="퐁이"/>)
 expect(screen.getByText('공격이 빗나갔습니다.',{selector:'p'})).toBeTruthy()
 expect(screen.queryByText('피해 0')).toBeNull()
 const heal:CombatEvent={kind:'status',effect:'lifesteal',healing:3,text:'피흡으로 체력 3 회복!'}
 view.rerender(<CombatResultLog event={heal} text={heal.text} speaker="퐁이"/>)
 expect(screen.getByRole('status').getAttribute('data-tone')).toBe('recovery')
 expect(screen.getByText('체력 3')).toBeTruthy()
})
it('replaces the outgoing sentence with the reply while keeping a single visible line',()=>{
 const attack:CombatEvent={kind:'player',damage:10,text:'10 피해를 입혔습니다.'}
 const reply:CombatEvent={kind:'monster',damage:5,text:'5 피해를 받았습니다.'}
 const view=render(<CombatResultLog event={attack} text={attack.text} speaker="퐁이"/>)
 expect(screen.getByRole('status').querySelectorAll('p')).toHaveLength(1)
 expect(screen.getByRole('status').querySelector('p')?.textContent).toBe('10 피해를 입혔습니다.')
 view.rerender(<CombatResultLog event={reply} text={reply.text} speaker="전갈"/>)
 expect(screen.getByRole('status').querySelectorAll('p')).toHaveLength(1)
 expect(screen.getByRole('status').querySelector('p')?.textContent).toBe('5 피해를 입었습니다.')
 expect(screen.getByRole('status').getAttribute('data-tone')).toBe('harm')
})
