import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {acquiredItemIds} from '@/features/exploration/acquisition-history'
import {newPractice,buyMerchantItem,floorMerchantGoods,grantPracticeSupplies} from '@/features/exploration/practice-state'
import {enterShopkeeper} from '@/features/exploration/shop-state'
import {getShopkeeper,shopkeepers} from '@/features/exploration/shopkeepers'
import {drawRoomLoot,receiveRoomLoot,refreshRoomLoot,sellRoomGear} from '@/features/exploration/room-loot'
import {learnShamanSpell,shamanLearningBlock,shamanSpells} from '@/features/exploration/shaman-stock'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {LootDialog} from '@/features/exploration/loot-dialog'
afterEach(cleanup)
it('removes purchased and sold gear from current offers, future offers and drops',()=>{
 const entered=enterShopkeeper(newPractice(),getShopkeeper('hasan'),()=>0),id=entered.market.weaponIds[0]
 const bought=buyMerchantItem(entered,id);expect(acquiredItemIds(bought).has(id)).toBe(true)
 expect(floorMerchantGoods(bought).some(item=>item.id===id)).toBe(false)
 const sold=sellRoomGear(bought,'weapon',id);expect(sold.weapons.some(item=>item.id===id)).toBe(false)
 const next=enterShopkeeper({...sold,market:{...sold.market,floor:2}},getShopkeeper('hasan'),()=>0)
 expect(next.market.weaponIds).not.toContain(id)
 for(let index=0;index<100;index++)expect(drawRoomLoot(sold,'starter',()=>(index+.5)/100).id).not.toBe(id)
})
it('remembers loot and replaced gear and refreshes stale rewards without gold conversion',()=>{
 let state=newPractice();const first=drawRoomLoot(state,'starter',()=>0);state=receiveRoomLoot(state,first)
 state=receiveRoomLoot(state,drawRoomLoot(state,'starter',()=>0));const third=drawRoomLoot(state,'starter',()=>0)
 state=receiveRoomLoot(state,third,first.id)
 expect(state.weapons.some(item=>item.id===first.id)).toBe(false);expect(acquiredItemIds(state).has(first.id)).toBe(true)
 expect(drawRoomLoot(state,'starter',()=>0).id).not.toBe(first.id)
 expect(receiveRoomLoot(state,first)).toBe(state);expect(refreshRoomLoot(state,first,()=>0).id).not.toBe(first.id)
})
it('excludes previously learned magic from fresh stock and rejects learning it again',()=>{
 const state=enterShopkeeper(newPractice(),getShopkeeper('nadim'),()=>0),id=state.shamanStock!.spellIds[0],learned=learnShamanSpell(state,id)
 expect(acquiredItemIds(learned).has(id)).toBe(true)
 const next=enterShopkeeper({...learned,market:{...learned.market,floor:2}},getShopkeeper('nadim'),()=>0)
 expect(next.shamanStock!.spellIds).not.toContain(id)
 expect(shamanLearningBlock({...learned,spells:[]},id)).toBe('습득 완료')
})
it('keeps repeatable potions when all non-repeatable equipment and magic have been acquired',()=>{
 const state={...newPractice(),acquiredIds:[...explorationWeapons,...explorationArmor,...shamanSpells].map(item=>item.id)}
 for(const profile of shopkeepers){const next=enterShopkeeper(state,profile,()=>0);if(profile.kind==='equipment'){expect(next.market.weaponIds).toEqual([]);expect(next.market.armorIds).toEqual([]);expect(floorMerchantGoods(next).map(item=>item.kind)).toEqual(['potion','potion'])}else expect(next.shamanStock!.spellIds).toEqual([])}
 expect(drawRoomLoot(state,'starter',()=>0).kind).toBe('potion')
})
it('keeps actual practice grants in acquisition history',()=>{
 const state=grantPracticeSupplies(newPractice()),history=acquiredItemIds(state)
 for(const item of [...state.weapons,...state.armor,...state.spells])expect(history.has(item.id)).toBe(true)
})
it.each([false,true])('shows exactly one storage button with full bag = %s',full=>{
 const state=full?grantPracticeSupplies(newPractice()):newPractice(),loot=drawRoomLoot(state,'starter',()=>0),claim=vi.fn()
 render(<LootDialog loot={loot} state={state} onClaim={claim}/>);const dialog=screen.getByRole('dialog',{name:'아이템 발견'})
 expect(within(dialog).getAllByRole('button')).toHaveLength(1)
 const button=within(dialog).getByRole('button',{name:'보관함에 넣기'})
 if(full){expect(button).toHaveProperty('disabled',true);fireEvent.change(within(dialog).getByRole('combobox',{name:'교체할 장비'}),{target:{value:state.weapons[0].id}})}
 fireEvent.click(button);expect(claim).toHaveBeenCalledWith(full?state.weapons[0].id:undefined)
 fireEvent.keyDown(dialog,{key:'Escape'});expect(screen.getByRole('dialog')).toBeTruthy()
})
