import {useState} from 'react'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PracticeInventory} from '@/features/exploration/practice-inventory'
import {discardGear,grantPracticeSupplies,newPractice,purchaseBlock} from '@/features/exploration/practice-state'
import {acquiredItemIds} from '@/features/exploration/acquisition-history'
afterEach(cleanup)
it('frees weapon and armor capacity without money or changes to equipped gear, preserving history',()=>{
 const state=grantPracticeSupplies(newPractice(()=>0))
 for(const kind of ['weapon','armor'] as const){
  const items=kind==='weapon'?state.weapons:state.armor,id=items[1].id
  const next=discardGear(state,kind,id)
  expect((kind==='weapon'?next.weapons:next.armor)).toHaveLength(2)
  expect(next.gold).toBe(state.gold);expect(next.hp).toBe(state.hp)
  expect(next.weaponId).toBe(state.weaponId);expect(next.armorId).toBe(state.armorId)
  expect(acquiredItemIds(next).has(id)).toBe(true)
  expect(discardGear(state,kind,kind==='weapon'?state.weaponId:state.armorId)).toBe(state)
  expect(discardGear(state,kind,'missing')).toBe(state)
  expect(items).toHaveLength(3)
 }
 const minimal=newPractice(()=>0)
 expect(discardGear(minimal,'weapon',minimal.weaponId)).toBe(minimal)
 expect(purchaseBlock(discardGear(state,'weapon',state.weapons[1].id),state.weapons[1].id)).toBeTruthy()
})
it('confirms a discard inline and updates capacity, with cancel and equipped protection',()=>{
 const initial=grantPracticeSupplies(newPractice(()=>0)),name=initial.weapons[1].name
 function Harness(){const [state,onChange]=useState(initial);return <PracticeInventory initialTab="weapon" open onOpenChange={()=>{}} state={state} onChange={onChange} onUsePotion={()=>false} onEquipChange={vi.fn()}/>}
 render(<Harness/>);
 expect(screen.queryByRole('button',{name:initial.weapons[0].name+' 버리기'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:name+' 버리기'}))
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 expect(screen.getByRole('heading',{name})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:name+' 버리기'}))
 fireEvent.click(screen.getByRole('button',{name:name+' 버리기 확인'}))
 expect(screen.queryByRole('heading',{name})).toBeNull()
 expect(screen.getByRole('tab',{name:/무기/}).textContent).toContain('2 / 3')
 fireEvent.click(screen.getByRole('tab',{name:/보호구/}))
 expect(screen.getByRole('button',{name:initial.armor[1].name+' 버리기'})).toBeTruthy()
})
