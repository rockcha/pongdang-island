import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {ExplorerCombatStats} from '@/features/exploration/combat-stats'
import {newPractice} from '@/features/exploration/practice-state'
afterEach(cleanup)
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
