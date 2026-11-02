import {afterEach,expect,it} from 'vitest'
import {cleanup,render,screen,within} from '@testing-library/react'
import {ShopLoadout} from '@/features/exploration/shop-loadout'
import {newPractice} from '@/features/exploration/practice-state'
import {starterSpell} from '@/features/exploration/starter-spell'

afterEach(cleanup)
it('compares only equipped items and reflects equipment mana discounts immediately',()=>{
 const state=newPractice(()=>.5)
 state.weapons=[{id:'staff',name:'절약 지팡이',description:'',attack:15,critical:3,spellManaDiscount:1},{id:'sword',name:'보관 중인 검',description:'',attack:20}]
 state.weaponId='staff'
 state.spells=[starterSpell];state.equippedSpells=[starterSpell.id]
 const view=render(<ShopLoadout state={state}/>)
 const panel=screen.getByRole('region',{name:'현재 장착 능력치'})
 expect(within(panel).getByText('절약 지팡이')).toBeTruthy()
 expect(within(panel).queryByText('보관 중인 검')).toBeNull()
 expect(within(panel).getByText('마나 4 소모')).toBeTruthy()
 expect(within(panel).getByText('기본 피해 12')).toBeTruthy()
 expect(within(panel).getByText('미장착')).toBeTruthy()
 view.rerender(<ShopLoadout state={{...state,weaponId:'sword'}}/>)
 expect(within(panel).getByText('보관 중인 검')).toBeTruthy()
 expect(within(panel).getByText('마나 5 소모')).toBeTruthy()
 expect(within(panel).queryByText('절약 지팡이')).toBeNull()
})
