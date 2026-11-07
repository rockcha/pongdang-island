import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router'
import {initialTopview,topviewItems,placementValid,type FarmTool,type TopviewState} from '@/features/farm/topview-model'
import {basicFarmBuildings,isBasicFarmBuilding} from '@/features/farm/building-rules'
import {buyFarmItem} from '@/features/farm/farm-stock'
import {farmPurchaseLimit,farmGoods,simulateFarm,type FarmGood} from '@/features/farm/farm-simulation'
import {farmTiles} from '@/features/farm/tile-catalog'
import {farmCrops,cropKinds} from '@/features/farm/crop-catalog'
import {farmAnimals,ANIMAL_PURCHASE_SECONDS} from '@/features/farm/animal-catalog'
import {farmRecipes,farmProducts,recipeIds,millProducts,millRecipes,isFinishedFood,isDeliverableGood,finishedFoods} from '@/features/farm/food-catalog'
import {FarmShop} from '@/features/farm/farm-shop'
import {FarmTradePanel} from '@/features/farm/market-panel'
import {TopviewArt} from '@/features/farm/topview-art'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {playSaleSound} from '@/features/gold/purchase-sound'
vi.mock('@/features/gold/purchase-sound',()=>({playSaleSound:vi.fn(),playPurchaseSound:vi.fn()}))
afterEach(()=>{cleanup();vi.clearAllMocks()})

it('starts with exactly five free singleton facilities and no unpaid production buildings or animals',()=>{
 const state=initialTopview(),buildings=state.objects.filter(o=>topviewItems[o.kind].group==='건물')
 expect(buildings.map(o=>o.kind).sort()).toEqual([...basicFarmBuildings].sort())
 expect(state.objects.some(o=>topviewItems[o.kind].group==='동물')).toBe(false)
 for(const kind of basicFarmBuildings){
  expect(farmPurchaseLimit(kind)).toBe(1)
  expect(buyFarmItem(state,kind)).toBe(state)
  const stored=simulateFarm(state,state.objects.find(o=>o.kind===kind)!.id,{type:'storeBuilding'},0).state
  if(stored!==state)expect(buyFarmItem(stored,kind)).toBe(stored)
 }
 for(const object of state.objects)expect(placementValid(state,object.kind,object.x,object.y,object.id)).toBe(true)
})
it('allows repeated purchases of every other current facility, including the dairy and research lab',()=>{
 const state={...initialTopview(),gold:1000000}
 for(const kind of Object.keys(topviewItems) as FarmTool[]){
  if(topviewItems[kind].group!=='건물'||kind==='processed'||isBasicFarmBuilding(kind))continue
  const bought=buyFarmItem(state,kind,3)
  expect(bought.stored.filter(k=>k===kind)).toHaveLength(3)
  expect(bought.gold).toBe(state.gold-topviewItems[kind].price*3)
 }
})
it('keeps tiles and decorations in the requested price bands and applies the requested building prices',()=>{
 for(const tile of farmTiles){expect(tile.price).toBeGreaterThanOrEqual(10);expect(tile.price).toBeLessThanOrEqual(50)}
 for(const [kind,item]of Object.entries(topviewItems))if(item.group==='꾸미기'&&kind!=='plot'){expect(item.price).toBeGreaterThanOrEqual(100);expect(item.price).toBeLessThanOrEqual(1000)}
 for(const [kind,price]of Object.entries({butcher:3000,dairy:2000,mill:2000,kitchen:4000,advancedKitchen:8000}))expect(topviewItems[kind as FarmTool].price).toBe(price)
 expect(farmAnimals.chicken.price).toBeGreaterThan(300);expect(farmAnimals.cow.price).toBeGreaterThan(800)
 for(const crop of cropKinds){expect(farmCrops[crop].seedPrice).toBeGreaterThanOrEqual(45);expect(farmCrops[crop].yield).toBe(3)}
})
it('charges a full harvest for milling and rewards additional ingredients and processing stages',()=>{
 for(const id of millProducts){const recipe=millRecipes[id];expect(recipe.input).toBe(farmCrops[recipe.crop].yield);expect(recipe.output).toBe(1);expect(farmProducts[id].price).toBeGreaterThan(farmGoods[recipe.crop].price*recipe.input)}
 for(const id of recipeIds){
  const recipe=farmRecipes[id],cost=recipe.ingredients.reduce((sum,item)=>sum+farmGoods[item.good].price*item.quantity,0)
  expect(farmGoods[id].price).toBeGreaterThan(cost)
  if(isFinishedFood(id)&&recipe.ingredients.length>=4)expect(farmGoods[id].price/cost).toBeGreaterThanOrEqual(2.2)
  if(recipe.building==='dairy')expect(recipe.ingredients.find(item=>item.good==='milk')!.quantity).toBeGreaterThanOrEqual(3)
 }
 expect(farmProducts.meatStew.price).toBeGreaterThan(farmProducts.butterSteak.price)
 expect(farmProducts.chickenGratin.price).toBeGreaterThan(farmProducts.chickenSoup.price)
 expect(farmProducts.duckFriedRice.price).toBeGreaterThan(farmProducts.duckPotatoStirFry.price)
 expect(farmProducts.cornCookies.price).toBeGreaterThan(farmProducts.butterCookies.price)
})
it.each(Object.keys(farmGoods).filter(good=>!isDeliverableGood(good)) as FarmGood[])('refuses %s at the delivery counter without changing stock or gold',good=>{
 const state=initialTopview();state.simulation.inventory[good]=10
 const result=simulateFarm(state,2,{type:'marketSell',good,quantity:1},0)
 expect(result.state).toBe(state);expect(result.effect).toBeUndefined()
 expect(simulateFarm(state,2,{type:'sell',good,quantity:1,orderDay:'2026-11-06'},0).state).toBe(state)
})
it.each(finishedFoods)('delivers %s exactly once and credits the configured reward',good=>{
 const state=initialTopview();state.simulation.inventory[good]=1
 const result=simulateFarm(state,2,{type:'marketSell',good,quantity:1},0)
 expect(result.state.simulation.inventory[good]).toBe(0)
 expect(result.state.gold).toBe(state.gold+farmGoods[good].price)
 expect(simulateFarm(result.state,2,{type:'marketSell',good,quantity:1},0).state).toBe(result.state)
})

function buyAndPlace(state:TopviewState,kind:FarmTool,id:number,x:number,y:number){
 const bought=buyFarmItem(state,kind)
 expect(bought).not.toBe(state);expect(placementValid(bought,kind,x,y)).toBe(true)
 const index=bought.stored.indexOf(kind)
 return {...bought,stored:bought.stored.filter((_,i)=>i!==index),objects:[...bought.objects,{id,kind,x,y}]}
}
it('completes a starter path from paid buildings and a chicken through milling, baking and delivery',()=>{
 let state=initialTopview()
 state=buyAndPlace(state,'coop',90,10,9);state=buyAndPlace(state,'mill',91,6,13);state=buyAndPlace(state,'bakery',92,18,9)
 state=simulateFarm(state,18,{type:'animal',animal:'chicken'},0).state
 expect(state.simulation.animalPurchaseJobs[18]).toBeUndefined()
 state=simulateFarm(state,90,{type:'animal',animal:'chicken'},0).state
 state=simulateFarm(state,90,{type:'completeAnimalPurchase'},ANIMAL_PURCHASE_SECONDS*1000).state
 expect(state.stored).toContain('chicken')
 state={...state,stored:state.stored.filter(k=>k!=='chicken'),objects:[...state.objects,{id:95,kind:'chicken',x:14,y:10}]}
 state=simulateFarm(state,95,{type:'startAnimal'},10000).state
 state=simulateFarm(state,91,{type:'mill',product:'flour',quantity:2},10000).state
 state=simulateFarm(state,91,{type:'collectFlour'},20000).state
 expect(state.simulation.inventory.flour).toBe(2)
 state=simulateFarm(state,95,{type:'collectAnimal'},20000).state
 expect(simulateFarm(state,92,{type:'craft',recipe:'eggCookies',quantity:1},20000).state).toBe(state)
 state=simulateFarm(state,95,{type:'feed'},20000).state
 state=simulateFarm(state,95,{type:'collectAnimal'},30000).state
 state=simulateFarm(state,92,{type:'craft',recipe:'eggCookies',quantity:1},30000).state
 state=simulateFarm(state,92,{type:'collectCraft'},35000).state
 expect(state.simulation.inventory.eggCookies).toBe(1)
 state=simulateFarm(state,2,{type:'marketSell',good:'eggCookies',quantity:1},35000).state
 expect(state.gold).toBe(15000-topviewItems.coop.price-topviewItems.mill.price-topviewItems.bakery.price-farmAnimals.chicken.price+farmProducts.eggCookies.price)
})
it.each(recipeIds)('reserves the current batch ingredients for %s and collects two products only once',id=>{
 const state=initialTopview(),recipe=farmRecipes[id]
 state.objects.push({id:90,kind:recipe.building,x:14,y:13})
 state.objects.find(o=>o.kind==='warehouse')!.level=10
 state.simulation.unlockedAnimals=['cow','chicken','duck','sheep']
 for(const item of recipe.ingredients)state.simulation.inventory[item.good]=item.quantity*2
 expect(simulateFarm(state,90,{type:'craft',recipe:id,quantity:3},0).state).toBe(state)
 const started=simulateFarm(state,90,{type:'craft',recipe:id,quantity:2},0).state
 expect(started).not.toBe(state)
 for(const item of recipe.ingredients)expect(started.simulation.inventory[item.good]).toBe(0)
 expect(simulateFarm(started,90,{type:'collectCraft'},recipe.seconds*1000-1).state).toBe(started)
 const collected=simulateFarm(started,90,{type:'collectCraft'},recipe.seconds*1000).state
 expect(collected.simulation.inventory[id]).toBe(2)
 expect(simulateFarm(collected,90,{type:'collectCraft'},recipe.seconds*1000).state).toBe(collected)
})
it.each(millProducts)('reserves six crops to mill a two-unit batch of %s',id=>{
 const state=initialTopview(),recipe=millRecipes[id]
 state.objects.push({id:91,kind:'mill',x:6,y:13});state.simulation.unlockedCrops.push(recipe.crop)
 state.simulation.inventory[recipe.crop]=recipe.input*2
 const started=simulateFarm(state,91,{type:'mill',product:id,quantity:2},0).state
 expect(started.simulation.inventory[recipe.crop]).toBe(0)
 const collected=simulateFarm(started,91,{type:'collectFlour'},recipe.seconds*1000).state
 expect(collected.simulation.inventory[id]).toBe(2)
 expect(simulateFarm(collected,91,{type:'collectFlour'},recipe.seconds*1000).state).toBe(collected)
})
it('offers an extra warehouse, hides singleton starter buildings, and accepts quantities for repeatable facilities',()=>{
 const state=initialTopview(),onBuy=vi.fn(()=>'' )
 render(<FarmShop state={state} onBuy={onBuy} onBuyTiles={()=>''} onClose={()=>{}}/>)
 const shop=screen.getByRole('dialog',{name:'상점'})
 for(const kind of basicFarmBuildings.filter(kind=>kind!=='warehouse'))expect(within(shop).queryByRole('article',{name:topviewItems[kind].name})).toBeNull()
 expect(within(shop).getByRole('article',{name:'창고'})).toBeTruthy()
 expect(shop.textContent).not.toContain('여러 채 건설 가능')
 fireEvent.change(screen.getByRole('spinbutton',{name:'유제품 공방 구매 수량'}),{target:{value:'2'}})
 fireEvent.click(screen.getByRole('button',{name:'유제품 공방 2개 구매 · 4,000 G'}))
 expect(onBuy).toHaveBeenCalledWith('dairy',2)
})
it('shows only deliverable food, including dairy drinks but excluding cheese, flour and raw crops',()=>{
 const state=initialTopview(),onAction=vi.fn();state.simulation.inventory.yogurt=2
 render(<FarmTradePanel kind="store" state={state} onAction={onAction}/>)
 for(const name of ['치즈 선택','밀가루 선택','밀 선택','우유 선택'])expect(screen.queryByRole('button',{name})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'요구르트 선택'}));fireEvent.click(screen.getByRole('button',{name:'전체'}));fireEvent.click(screen.getByRole('button',{name:'요구르트 납품'}))
 expect(onAction).toHaveBeenCalledWith({type:'marketSell',good:'yogurt',quantity:2})
})
it('keeps animated animal artwork optional so object editing can use a still image',()=>{
 const {container,rerender}=render(<TopviewArt kind="cow" idle idlePhase={3}/>)
 expect(container.querySelector('[data-animal-idle="cow"]')).toBeTruthy()
 expect(parseFloat((container.querySelector('.farm-animal-idle-frame') as SVGElement).style.animationDelay)).toBeCloseTo(-1.11)
 rerender(<TopviewArt kind="cow"/>)
 expect(container.querySelector('[data-animal-idle]')).toBeNull()
})
it('renders a basic-only fresh farm and opens the renamed delivery counter without sales tabs',()=>{
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'요리 납품소 (11,6)'}))
 expect(screen.getByRole('dialog',{name:'요리 납품소'})).toBeTruthy()
 expect(screen.queryByRole('navigation',{name:'판매 분류'})).toBeNull()
 expect(screen.queryByRole('button',{name:'밀 납품'})).toBeNull()
 expect(playSaleSound).not.toHaveBeenCalled()
})
