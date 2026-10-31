import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {EnemyAilments,PlayerAilments,AilmentGuide,type EnemyAilment} from '@/features/exploration/ailments'
import {newPractice} from '@/features/exploration/practice-state'
afterEach(cleanup)
it('shows the lizard curse as one basic attack and closes its details when consumed',()=>{
 const state={...newPractice(),combat:{enemyHp:36,turn:1,status:'active' as const,playerWeaken:2}}
 const view=render(<PlayerAilments state={state}/>)
 fireEvent.click(screen.getByRole('button',{name:'약화 · 다음 기본 공격력 2 감소 · 1회 남음'}))
 expect(screen.getByRole('dialog').textContent).toContain('마법 사용으로는 소모되지 않으며')
 view.rerender(<PlayerAilments state={{...state,combat:{...state.combat,playerWeaken:undefined}}}/>)
 expect(screen.queryByRole('list')).toBeNull();expect(screen.queryByRole('dialog')).toBeNull()
})
it('explains the one-turn magic resistance reduction and removes its badge when it expires',()=>{
 const state={...newPractice(),combat:{enemyHp:65,turn:1,status:'active' as const,magicResistanceDown:10}}
 const view=render(<PlayerAilments state={state}/>)
 const badge=screen.getByRole('button',{name:'마법 저항력 10 감소 · 1턴 남음'})
 expect(badge.querySelector('svg')).toBeTruthy()
 fireEvent.click(badge)
 expect(screen.getByRole('dialog').textContent).toContain('다음 턴의 적 행동이 끝나면 해제')
 view.rerender(<PlayerAilments state={{...state,combat:{...state.combat,magicResistanceDown:undefined}}}/>)
 expect(screen.queryByRole('list')).toBeNull()
 expect(screen.queryByRole('dialog')).toBeNull()
})
it('shows player blindness and burn as separate clickable effects and removes consumed effects',()=>{
 const state={...newPractice(),playerEffects:[{kind:'burn' as const,amount:40,turns:2}],combat:{monsterId:'sand-wraith' as const,enemyHp:70,turn:1,status:'active' as const,playerBlind:30}}
 const view=render(<PlayerAilments state={state}/>)
 expect(screen.getByRole('list',{name:'탐험가 상태이상'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'실명 · 다음 기본 공격 1회의 명중률 30% 감소 · 1회 남음'}).querySelector('svg')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'화상 · 치유량 40% 감소 · 2턴 남음'}))
 expect(screen.getByRole('dialog').textContent).toContain('받는 치유량 감소')
 view.rerender(<PlayerAilments state={{...state,playerEffects:[]}}/>)
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.queryByRole('button',{name:/화상/})).toBeNull()
 view.rerender(<PlayerAilments state={{...state,playerEffects:[],combat:{...state.combat,playerBlind:undefined}}}/>)
 expect(screen.queryByRole('list')).toBeNull()
})
it('shows actual effect values and durations, opens details and removes expired badges',()=>{
 const effects:EnemyAilment[]=[{kind:'bleed',amount:3,turns:2},{kind:'burn',amount:45,turns:3},{kind:'freeze',amount:1,turns:1}]
 const view=render(<EnemyAilments effects={effects}/>)
 expect(screen.getByRole('button',{name:'출혈 · 턴당 피해 3 · 2턴 남음'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'빙결 · 행동 불가 · 1회 남음'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'화상 · 치유량 45% 감소 · 3턴 남음'}))
 expect(screen.getByRole('dialog').textContent).toContain('치유량 45% 감소')
 expect(screen.getByRole('dialog').textContent).toContain('받는 치유량 감소')
 view.rerender(<EnemyAilments effects={[]}/>)
 expect(screen.queryByRole('list')).toBeNull()
})
it('explains all five icons and distinguishes anti-healing from damage',()=>{
 render(<AilmentGuide/>);fireEvent.click(screen.getByRole('button',{name:'상태이상 안내'}))
 expect(screen.getByRole('dialog')).toBeTruthy()
 for(const name of ['출혈','빙결','화상','약화','실명'])expect(screen.getByRole('heading',{name})).toBeTruthy()
 expect(screen.getByText('받는 치유량 감소')).toBeTruthy()
})
