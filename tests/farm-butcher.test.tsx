import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {initialTopview,placementValid} from '@/features/farm/topview-model'
import {farmAnimalHousing,simulateFarm} from '@/features/farm/farm-simulation'
import {farmAnimalKinds} from '@/features/farm/animal-catalog'
import {butcherRecipes} from '@/features/farm/butcher-catalog'
import {buyFarmItem} from '@/features/farm/farm-stock'
import {isFinishedFood,recipesForBuilding} from '@/features/farm/food-catalog'
import {FarmProductionDialog} from '@/features/farm/production-dialog'
const setup=()=>{const state=initialTopview();state.objects.push({id:90,kind:'butcher',x:8,y:15});return state}
afterEach(cleanup)
it.each(farmAnimalKinds)('converts only stored %s copies, preserves placed animals and remaining transforms',animal=>{
 const state=setup(),recipe=butcherRecipes[animal]
 state.stored=['flowers',animal,animal,animal]
 state.storedTransforms={[animal]:[{flipped:true},{flipped:false},{flipped:true}]}
 const before=farmAnimalHousing(state,animal).total
 const result=simulateFarm(state,90,{type:'butcher',animal,quantity:2},0)
 expect(result.state.stored).toEqual(['flowers',animal])
 expect(result.state.storedTransforms?.[animal]).toEqual([{flipped:true}])
 expect(result.state.objects).toEqual(state.objects)
 expect(result.state.gold).toBe(state.gold)
 expect(result.state.simulation.inventory[recipe.good]).toBe(recipe.output*2)
 expect(farmAnimalHousing(result.state,animal).total).toBe(before-2)
 expect(simulateFarm(result.state,90,{type:'butcher',animal,quantity:2},0).state).toBe(result.state)
})
it('rejects placed or pending animals, invalid quantities and the wrong building',()=>{
 const state=setup()
 state.simulation.animalPurchaseJobs[3]={animal:'cow',startedAt:0,readyAt:10}
 expect(simulateFarm(state,90,{type:'butcher',animal:'cow',quantity:1},20).state).toBe(state)
 state.stored=['cow']
 for(const quantity of [0,-1,1.5,2,NaN,Infinity])expect(simulateFarm(state,90,{type:'butcher',animal:'cow',quantity},0).state).toBe(state)
 expect(simulateFarm(state,3,{type:'butcher',animal:'cow',quantity:1},0).state).toBe(state)
})
it('checks warehouse space before consuming an animal and permits an exact fit',()=>{
 const state=setup();state.stored=['cow'];state.simulation.inventory.wheat=28
 expect(simulateFarm(state,90,{type:'butcher',animal:'cow',quantity:1},0).state).toBe(state)
 state.simulation.inventory.wheat=27
 const result=simulateFarm(state,90,{type:'butcher',animal:'cow',quantity:1},0).state
 expect(result.simulation.inventory.redMeat).toBe(3);expect(result.stored).toEqual([])
 state.simulation.upgradeJobs[26]={startedAt:0,readyAt:1000,fromLevel:1}
 expect(simulateFarm(state,90,{type:'butcher',animal:'cow',quantity:1},0).state).toBe(state)
})
it('offers a purchasable two-cell butcher and submits the selected stored animal count',()=>{
 const state=setup(),onAction=vi.fn();state.stored=['duck','duck']
 expect(buyFarmItem(state,'butcher').stored).toContain('butcher')
 expect(placementValid(state,'butcher',8,15,90)).toBe(true)
 render(<FarmProductionDialog object={state.objects.find(o=>o.id===90)!} state={state} message="" onAction={onAction} onClose={()=>{}} onResearch={()=>{}}/>)
 expect((screen.getByRole('button',{name:'보관함에 동물이 없어요'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'오리 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'투입 동물 수 늘리기'}))
 fireEvent.click(screen.getByRole('button',{name:'오리 2마리 넣기 · 오리고기 4개'}))
 expect(onAction).toHaveBeenCalledWith({type:'butcher',animal:'duck',quantity:2})
})
it('removes grilled rice balls from new recipes and orders but finishes an existing job once',()=>{
 const state=setup()
 expect(recipesForBuilding('advancedKitchen')).not.toContain('grilledRiceBall')
 expect(isFinishedFood('grilledRiceBall')).toBe(false)
 Object.assign(state.simulation.inventory,{rice:2,egg:1,cheese:1,tomatoKetchup:1})
 expect(simulateFarm(state,30,{type:'craft',recipe:'grilledRiceBall',quantity:1},0).state).toBe(state)
 state.simulation.processingJobs[30]={recipe:'grilledRiceBall',quantity:1,startedAt:0,readyAt:8000}
 const done=simulateFarm(state,30,{type:'collectCraft'},8000).state
 expect(done.simulation.inventory.grilledRiceBall).toBe(1)
 expect(simulateFarm(done,30,{type:'collectCraft'},8000).state).toBe(done)
})
