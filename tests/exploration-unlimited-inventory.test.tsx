import {useState} from 'react'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PracticeInventory} from '@/features/exploration/practice-inventory'
import {buyMerchantItem,newPractice,grantPracticeSupplies} from '@/features/exploration/practice-state'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {drawRoomLoot,receiveRoomLoot} from '@/features/exploration/room-loot'

afterEach(cleanup)
it('can purchase the entire equipment catalog without losing existing or equipped gear',()=>{
 const base=newPractice(()=>0)
 let state={...base,market:{...base.market,weaponIds:explorationWeapons.map(x=>x.id),armorIds:explorationArmor.map(x=>x.id)}}
 for(const item of [...explorationWeapons,...explorationArmor])state=buyMerchantItem(state,item.id)
 expect(state.weapons).toHaveLength(explorationWeapons.length+1);expect(state.armor).toHaveLength(explorationArmor.length+1)
 expect(state.weaponId).toBe(base.weaponId);expect(state.armorId).toBe(base.armorId)
 expect(buyMerchantItem(state,explorationWeapons[0].id)).toBe(state)
 const supplied=grantPracticeSupplies(state);expect(supplied.weapons.length).toBeGreaterThan(state.weapons.length)
 for(const item of state.weapons)expect(supplied.weapons).toContainEqual(item)
})
it('keeps every reward through repeated collection beyond the former limit',()=>{
 const base=newPractice(()=>0);let state=base
 for(let index=0;index<25;index++){
  const loot=drawRoomLoot(state,'starter',()=>index%2===0?0:.99),before=state
  state=receiveRoomLoot(state,loot)
  expect(state.weapons.length+state.armor.length).toBe(before.weapons.length+before.armor.length+1)
  for(const item of before.weapons)expect(state.weapons).toContainEqual(item)
  for(const item of before.armor)expect(state.armor).toContainEqual(item)
 }
 expect(state.weaponId).toBe(base.weaponId);expect(state.armorId).toBe(base.armorId)
})
it('shows all owned gear, no discard or capacity controls, and still allows equipping',()=>{
 const base=newPractice(()=>0),initial={...base,weapons:[...base.weapons,...explorationWeapons.slice(0,7)],armor:[...base.armor,...explorationArmor.slice(0,6)]}
 let latest=initial
 function Harness(){const [state,onChange]=useState(initial);latest=state;return <PracticeInventory initialTab="weapon" open onOpenChange={()=>{}} state={state} onChange={onChange} onUsePotion={()=>false} onEquipChange={vi.fn()}/>}
 render(<Harness/>);expect(screen.getByRole('tab',{name:/무기/}).textContent).toContain('8')
 expect(screen.getAllByRole('heading',{level:3})).toHaveLength(8)
 expect(screen.queryByRole('button',{name:/버리기/})).toBeNull();expect(document.querySelector('.exploration-empty-slot')).toBeNull()
 fireEvent.click(screen.getAllByRole('button',{name:'주 무기로 선택'})[0]);expect(latest.weaponId).toBe(explorationWeapons[0].id);expect(latest.weapons).toHaveLength(8)
 fireEvent.click(screen.getByRole('tab',{name:/보호구/}));expect(screen.getAllByRole('heading',{level:3})).toHaveLength(7)
 expect(screen.getByRole('tab',{name:/보호구/}).textContent).not.toContain('/ 3');expect(screen.queryByRole('button',{name:/버리기/})).toBeNull()
})
