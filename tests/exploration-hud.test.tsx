import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {ExplorerCombatStats} from '@/features/exploration/combat-stats'
import {newPractice} from '@/features/exploration/practice-state'
import {PlayerAilments} from '@/features/exploration/ailments'
afterEach(cleanup)
it('shows empty buff and status slots and opens the details of an active effect',()=>{
 const state=newPractice(()=>0)
 const view=render(<PlayerAilments state={state}/>)
 expect(screen.getAllByText('없음')).toHaveLength(2)
 view.rerender(<PlayerAilments state={{...state,playerEffects:[{kind:'bleed',amount:3,turns:2}]}}/>)
 expect(screen.getAllByText('없음')).toHaveLength(1)
 fireEvent.click(screen.getByRole('button',{name:/출혈.*턴당 피해 3.*2턴 남음/}))
 expect(screen.getByRole('dialog',{name:'출혈'}).textContent).toContain('플레이어 행동이 끝날 때')
})
it('shows all five current stats, including buffs and a negative magic resistance',()=>{
 const state={...newPractice(),combat:{enemyHp:70,turn:1,status:'active' as const,magicResistanceDown:10,attackBuff:{attack:20,critical:15,turns:4}}}
 render(<ExplorerCombatStats state={state}/>)
 for(const label of ['공격력 30 설명','치명타 20% 설명','회피율 5% 설명','방어력 1 설명','마법 저항력 -10 설명'])expect(screen.getByRole('button',{name:label})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'마법 저항력 -10 설명'}))
 expect(screen.getByRole('dialog',{name:'마법 저항력 · -10'})).toBeTruthy()
 expect(screen.getByText(/음수가 되면/)).toBeTruthy()
})
it('opens stat explanations with the keyboard',()=>{
 render(<ExplorerCombatStats state={newPractice()}/>)
 fireEvent.keyDown(screen.getByRole('button',{name:'치명타 5% 설명'}),{key:'Enter'})
 expect(screen.getByRole('dialog',{name:'치명타 · 5%'})).toBeTruthy()
})
it('explains all five icons from the compact header without losing current modifiers',()=>{
 const state={...newPractice(),combat:{enemyHp:70,turn:1,status:'active' as const,magicResistanceDown:10}}
 render(<ExplorerCombatStats state={state} iconsOnly/>)
 fireEvent.click(screen.getByRole('button',{name:'능력치 아이콘 안내'}))
 const dialog=screen.getByRole('dialog',{name:'능력치 아이콘 안내'})
 expect([...dialog.querySelectorAll('dt')].map(el=>el.textContent)).toEqual(['공격력10','치명타5%','회피율5%','방어력1','마법 저항력-10'])
 expect(dialog.textContent).toContain('마법 공격에는 적용되지 않습니다.')
})
