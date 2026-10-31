import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {newPractice,equipGear,playerManaMax,playerMaxHp,usePotion,buyMerchantItem} from '@/features/exploration/practice-state'
import {receiveRoomLoot,type RoomLoot} from '@/features/exploration/room-loot'
import {GearAttributes} from '@/features/exploration/equipment-stats'
import {enterShopkeeper} from '@/features/exploration/shop-state'
import {getShopkeeper} from '@/features/exploration/shopkeepers'

afterEach(cleanup)
const staff=explorationWeapons.find(x=>x.id==='lapis-moon-staff')!
const hammer=explorationWeapons.find(x=>x.id==='heartstone-warhammer')!
const robe=explorationArmor.find(x=>x.id==='starwell-priest-robe')!
function owned(){const state=newPractice(()=>0);return {...state,weapons:[...state.weapons,staff,hammer],armor:[...state.armor,robe],potions:{health:10,mana:10}}}
it('increases capacity without restoring mana and never restores it by re-equipping',()=>{
 const base=owned(),wielded=equipGear(base,'weapon',staff.id)
 expect(wielded.mp).toBe(40);expect(playerManaMax(wielded)).toBe(50)
 const filled=usePotion(wielded,'mana');expect(filled.mp).toBe(50)
 const removed=equipGear(filled,'weapon',base.weaponId);expect(removed.mp).toBe(40);expect(playerManaMax(removed)).toBe(40)
 expect(equipGear(removed,'weapon',staff.id).mp).toBe(40)
 expect(equipGear({...wielded,mp:12},'weapon',base.weaponId).mp).toBe(12)
})
it('keeps mana equipment independent of the permanent lantern health sacrifice',()=>{
 const equipped=equipGear(equipGear({...owned(),maxHpSacrifice:10,mp:30},'weapon',staff.id),'armor',robe.id)
 expect(playerManaMax(equipped)).toBe(65);expect(playerMaxHp(equipped)).toBe(100);expect(equipped.mp).toBe(30)
 const filled=usePotion(usePotion(usePotion(equipped,'mana'),'mana'),'mana');expect(filled.mp).toBe(65)
 const base=owned(),withoutWeapon=equipGear(filled,'weapon',base.weaponId),withoutBoth=equipGear(withoutWeapon,'armor',base.armorId)
 expect(withoutWeapon.mp).toBe(55);expect(withoutBoth.mp).toBe(40)
})
it('adds hammer health to armor health and clamps only the excess when switching',()=>{
 const base=owned(),hammered=equipGear({...base,hp:77},'weapon',hammer.id)
 expect(playerMaxHp(hammered)).toBe(125);expect(hammered.hp).toBe(77)
 const armored=equipGear(hammered,'armor',robe.id);expect(playerMaxHp(armored)).toBe(135);expect(armored.hp).toBe(77)
 const filled=usePotion(usePotion(armored,'health'),'health');expect(filled.hp).toBe(135)
 const removed=equipGear(filled,'weapon',base.weaponId);expect(removed.hp).toBe(110)
 expect(equipGear(removed,'weapon',hammer.id).hp).toBe(110)
})
it.each(['weapon','armor'] as const)('preserves equipped %s and resource capacity when buying another item',kind=>{
 const base=owned(),candidate=kind==='weapon'?explorationWeapons.find(x=>x.id==='desert-steel-longsword')!:explorationArmor.find(x=>x.id==='tomb-guardian-armor')!
 const equipped=equipGear(base,kind,kind==='weapon'?staff.id:robe.id)
 const full={...equipped,mp:playerManaMax(equipped),market:{...equipped.market,weaponIds:[candidate.id],armorIds:[candidate.id]}}
 const bought=buyMerchantItem(full,candidate.id)
 expect(bought.gold).toBeLessThan(full.gold);expect(bought.mp).toBe(full.mp);expect(bought.weaponId).toBe(full.weaponId);expect(bought.armorId).toBe(full.armorId)
})
it('keeps health and mana capacity when collecting additional weapons',()=>{
 const base=owned(),candidate=explorationWeapons.find(x=>x.id==='desert-steel-longsword')!
 const loot:RoomLoot={kind:'weapon',id:candidate.id,name:candidate.name,gear:candidate,image:candidate.image,price:candidate.price}
 const mage=receiveRoomLoot({...equipGear(base,'weapon',staff.id),mp:50},loot)
 expect(mage.mp).toBe(50);expect(mage.weaponId).toBe(staff.id);expect(mage.weapons).toHaveLength(4)
 const warrior=receiveRoomLoot({...equipGear(base,'weapon',hammer.id),hp:125},loot)
 expect(warrior.hp).toBe(125);expect(warrior.weaponId).toBe(hammer.id)
})
it('offers the new items through the middle-tier merchant and displays capacity bonuses',()=>{
 const state=owned(),shop=enterShopkeeper(newPractice(()=>0),getShopkeeper('karim'),()=>0)
 expect(shop.market.weaponIds).toContain(staff.id);expect(shop.market.weaponIds).toContain(hammer.id)
 expect(enterShopkeeper(newPractice(()=>0),getShopkeeper('karim'),()=>.99).market.armorIds).toContain(robe.id)
 render(<><GearAttributes gear={staff} compact/><GearAttributes gear={hammer} compact/><GearAttributes gear={robe} compact/></>)
 expect(screen.getByLabelText('최대 마나 +10')).toBeTruthy();expect(screen.getByLabelText('최대 마나 +15')).toBeTruthy();expect(screen.getByLabelText('최대 체력 +25')).toBeTruthy()
 expect(playerManaMax(state)).toBe(40)
})
