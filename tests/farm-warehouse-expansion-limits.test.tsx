import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {initialTopview} from '@/features/farm/topview-model'
import {buyFarmItem} from '@/features/farm/farm-stock'
import {simulateFarm,farmOwnedCount,farmCanPurchase,farmPurchaseLimit} from '@/features/farm/farm-simulation'
import {buildingLevel,buildingMaxLevel,warehouseCapacity,upgradeBuilding,UPGRADE_SECONDS} from '@/features/farm/building-upgrades'
import {applyFarmCommand,validFarmState} from '@/features/farm/account-engine'
import {BuildingUpgradePanel} from '@/features/farm/building-upgrade-panel'
import {FarmShop} from '@/features/farm/farm-shop'

afterEach(cleanup)
it('buys one extra warehouse and counts stored copies against the two-warehouse limit',()=>{
 const state=initialTopview()
 expect(farmOwnedCount(state,'warehouse')).toBe(1)
 expect(farmPurchaseLimit('warehouse')).toBe(2)
 expect(farmCanPurchase(state,'warehouse')).toBe(true)
 expect(buyFarmItem(state,'warehouse',2)).toBe(state)
 const bought=buyFarmItem(state,'warehouse')
 expect(bought.gold).toBe(state.gold-3000)
 expect(bought.stored).toEqual(['warehouse'])
 expect(farmOwnedCount(bought,'warehouse')).toBe(2)
 expect(farmCanPurchase(bought,'warehouse')).toBe(false)
 expect(buyFarmItem(bought,'warehouse')).toBe(bought)
 expect(buyFarmItem({...state,gold:2999},'warehouse')).toEqual({...state,gold:2999})
})
it('adds capacity only after construction and preserves the shared limit after recovery',()=>{
 let state=applyFarmCommand(initialTopview(),{type:'buy',kind:'warehouse',quantity:1},0)
 state=applyFarmCommand(state,{type:'place',kind:'warehouse',x:8,y:6,transform:{}},0)
 expect(warehouseCapacity(state)).toBe(40)
 expect(farmOwnedCount(state,'warehouse')).toBe(2)
 expect(buyFarmItem(state,'warehouse')).toBe(state)
 state=applyFarmCommand(state,{type:'tick'},10000)
 expect(warehouseCapacity(state)).toBe(80)
 const extra=state.objects.find(object=>object.kind==='warehouse'&&object.id!==26)!
 state=simulateFarm(state,extra.id,{type:'storeBuilding'},10000).state
 expect(warehouseCapacity(state)).toBe(40)
 expect(farmOwnedCount(state,'warehouse')).toBe(2)
 expect(buyFarmItem(state,'warehouse')).toBe(state)
 expect(validFarmState(state)).toBe(true)
})
it('upgrades a warehouse through all thirty levels for the unchanged price and duration',()=>{
 let state={...initialTopview(),gold:200000},now=0
 for(let level=1;level<30;level++){
  const gold=state.gold,oldCapacity=40+(level-1)*20
  state=upgradeBuilding(state,26,{type:'upgrade'},now).state
  expect(state.gold).toBe(gold-3000)
  expect(warehouseCapacity(state)).toBe(oldCapacity)
  expect(upgradeBuilding(state,26,{type:'completeUpgrade'},now+UPGRADE_SECONDS*1000-1).state).toBe(state)
  now+=UPGRADE_SECONDS*1000
  state=upgradeBuilding(state,26,{type:'completeUpgrade'},now).state
  expect(buildingLevel(state.objects.find(o=>o.id===26)!)).toBe(level+1)
 }
 expect(warehouseCapacity(state)).toBe(620)
 expect(state.gold).toBe(200000-29*3000)
 expect(upgradeBuilding(state,26,{type:'upgrade'},now).state).toBe(state)
 expect(buildingMaxLevel('mill')).toBe(10)
 expect(buildingMaxLevel('waterwheel')).toBe(10)
 expect(buildingLevel({id:100,kind:'kitchen',x:0,y:0,level:30})).toBe(10)
})
it('combines two max-level warehouses and preserves level thirty through storage and placement',()=>{
 let state=initialTopview();state.objects=state.objects.map(o=>o.kind==='warehouse'?{...o,level:30}:o)
 state.objects.push({id:50,kind:'warehouse',x:8,y:6,level:30})
 expect(warehouseCapacity(state)).toBe(1240)
 state=simulateFarm(state,26,{type:'storeBuilding'},0).state
 expect(state.storedLevels?.warehouse).toEqual([30])
 expect(warehouseCapacity(state)).toBe(620)
 state=applyFarmCommand(state,{type:'place',kind:'warehouse',x:14,y:13,transform:{}},0)
 state=applyFarmCommand(state,{type:'tick'},10000)
 expect(warehouseCapacity(state)).toBe(1240)
 expect(state.objects.find(o=>o.id===31)?.level).toBe(30)
})
it('shows the thirty-level ceiling and the second warehouse in the shop',()=>{
 const state=initialTopview(),onBuy=vi.fn(()=>''),warehouse=state.objects.find(o=>o.kind==='warehouse')!
 const {rerender}=render(<BuildingUpgradePanel object={{...warehouse,level:30}} state={state} now={0} onAction={()=>{}}/>)
 expect(screen.getByText('Lv. 30 / 30')).toBeTruthy()
 expect(screen.getByText('최고 레벨')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'업그레이드 · 3,000 G'})).toBeNull()
 rerender(<FarmShop state={state} onClose={()=>{}} onBuy={onBuy} onBuyTiles={()=>''}/>)
 const card=screen.getByRole('article',{name:'창고'})
 expect(within(card).getByText('보유 1')).toBeTruthy()
 fireEvent.click(within(card).getByRole('button',{name:'창고 구매 · 3000 G'}))
 expect(onBuy).toHaveBeenCalledWith('warehouse',1)
 rerender(<FarmShop state={buyFarmItem(state,'warehouse')} onClose={()=>{}} onBuy={onBuy} onBuyTiles={()=>''}/>)
 expect(within(screen.getByRole('article',{name:'창고'})).getByText('보유 2')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'창고 구매 · 3000 G'})).toBeNull()
})
