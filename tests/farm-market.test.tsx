import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {existsSync} from 'node:fs'
import {initialTopview,topviewItems} from '@/features/farm/topview-model'
import {farmGoods,simulateFarm} from '@/features/farm/farm-simulation'
import {farmProducts,farmRecipes,recipeIds} from '@/features/farm/food-catalog'
import {cropKinds} from '@/features/farm/crop-catalog'
import {farmSaleCategory,goodsForSale,removeRetiredMarket} from '@/features/farm/market-catalog'
import {farmBuildingArtPath} from '@/features/farm/building-art'
import {buyFarmItem} from '@/features/farm/farm-stock'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {FarmTradePanel} from '@/features/farm/market-panel'
import {playSaleSound} from '@/features/gold/purchase-sound'
vi.mock('@/features/gold/purchase-sound',()=>({playSaleSound:vi.fn(),playPurchaseSound:vi.fn()}))
afterEach(()=>{cleanup();vi.clearAllMocks();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('removes a market left in an open farm without changing the seed shop, sales counter, gold or goods',()=>{
 const state=initialTopview()
 const legacy={...state,objects:[...state.objects,{id:999,kind:'market',x:8,y:8}],stored:['market']} as unknown as typeof state
 const cleaned=removeRetiredMarket(legacy)
 expect(cleaned.objects).toEqual(state.objects)
 expect(cleaned.stored).toEqual([])
 expect(cleaned.gold).toBe(state.gold)
 expect(cleaned.simulation).toBe(state.simulation)
 expect(removeRetiredMarket(cleaned)).toBe(cleaned)
})
it('provides one seed shop and one sales counter and counts stored copies toward each single ownership limit',()=>{
 const state=initialTopview()
 for(const kind of ['seedShop','store'] as const){
  const object=state.objects.find(o=>o.kind===kind)!
  expect(state.objects.filter(o=>o.kind===kind)).toHaveLength(1)
  expect(topviewItems[kind]).toMatchObject({w:2,h:1,purchaseLimit:1})
  expect(existsSync('public'+farmBuildingArtPath(kind))).toBe(true)
  expect(buyFarmItem(state,kind)).toBe(state)
  const stored=simulateFarm(state,object.id,{type:'storeBuilding'},0).state
  expect(stored.stored).toContain(kind)
  expect(buyFarmItem(stored,kind)).toBe(stored)
  const empty={...state,objects:state.objects.filter(o=>o.kind!==kind)}
  expect(buyFarmItem(empty,kind,2)).toBe(empty)
  expect(buyFarmItem(empty,kind).stored).toContain(kind)
 }
 expect(state.gold).toBe(15000)
 expect(state.objects.some(o=>String(o.kind)==='market'||o.kind==='processed')).toBe(false)
 expect('market' in topviewItems).toBe(false)
 for(const kind of ['processed'] as const)expect(buyFarmItem(state,kind)).toBe(state)
})
it.each([...cropKinds,...Object.keys(farmProducts) as (keyof typeof farmProducts)[]])('sells any quantity of %s without daily orders and credits its full price',good=>{
 const state=initialTopview()
 state.simulation.inventory[good]=20
 const sold=simulateFarm(state,2,{type:'marketSell',good,quantity:13},0)
 expect(sold.state.simulation.inventory[good]).toBe(7)
 expect(sold.state.gold).toBe(state.gold+farmGoods[good].price*13)
 expect(sold.effect).toMatchObject({type:'sell',good,quantity:13,gold:farmGoods[good].price*13})
 expect(sold.state.simulation.orderDeliveries).toEqual({})
 expect(simulateFarm(sold.state,2,{type:'marketSell',good,quantity:7},86400000).state.simulation.inventory[good]).toBe(0)
 expect(simulateFarm(sold.state,2,{type:'marketSell',good,quantity:8},0).state).toBe(sold.state)
})
it('separates trade commands and rejects invalid sales or unavailable warehouses atomically',()=>{
 const state=initialTopview()
 for(const quantity of [0,-1,1.5,NaN,Infinity,13])expect(simulateFarm(state,2,{type:'marketSell',good:'wheat',quantity},0).state).toBe(state)
 expect(simulateFarm(state,23,{type:'marketSell',good:'wheat',quantity:1},0).state).toBe(state)
 expect(simulateFarm(state,2,{type:'seed',good:'wheatSeed',quantity:1},0).state).toBe(state)
 expect(simulateFarm(state,2,{type:'marketSell',good:'wheatSeed',quantity:1},0).state).toBe(state)
 state.gold=Number.MAX_SAFE_INTEGER
 expect(simulateFarm(state,2,{type:'marketSell',good:'wheat',quantity:1},0).state).toBe(state)
 state.gold=15000;state.simulation.upgradeJobs[26]={startedAt:0,readyAt:10000,fromLevel:1}
 expect(simulateFarm(state,2,{type:'marketSell',good:'wheat',quantity:1},0).state).toBe(state)
})
it('buys researched seeds only at the seed shop and keeps locked crops unavailable',()=>{
 const state=initialTopview()
 expect(simulateFarm(state,23,{type:'seed',good:'potatoSeed',quantity:1},0).state).toBe(state)
 const bought=simulateFarm(state,23,{type:'seed',good:'wheatSeed',quantity:3},0).state
 expect(bought.simulation.inventory.wheatSeed).toBe(state.simulation.inventory.wheatSeed+3)
 expect(bought.gold).toBe(state.gold-15)
})
it('classifies every current recipe by its producing facility and puts all dairy products in food',()=>{
 const state=initialTopview(),seen=new Set<string>()
 for(const category of ['crops','products','food'] as const)for(const good of goodsForSale(category,state.simulation.inventory)){expect(seen.has(good)).toBe(false);seen.add(good)}
 for(const id of recipeIds)expect(farmSaleCategory(id)).toBe(farmRecipes[id].building==='sauceWorkshop'?'products':'food')
 for(const id of ['butter','cheese','cream','yogurt','omurice','cornCookies'] as const)expect(goodsForSale('food',state.simulation.inventory)).toContain(id)
 for(const id of ['flour','sugar','rice','tomatoKetchup','redMeat'] as const)expect(goodsForSale('products',state.simulation.inventory)).toContain(id)
 expect(goodsForSale('crops',state.simulation.inventory)).toContain('wool')
 expect(seen.has('ricePudding')).toBe(false)
 state.simulation.inventory.ricePudding=1
 expect(goodsForSale('food',state.simulation.inventory)).toContain('ricePudding')
})
it('shows seed buying separately and three sales categories, with the gold effect and sound after a sale',()=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('종자 상점 (8,6)')
 expect(screen.queryByRole('navigation',{name:'판매 분류'})).toBeNull()
 expect(screen.getByRole('button',{name:'밀 종자 구매'})).toBeTruthy()
 click('Close');click('판매소 (11,6)')
 for(const name of ['농작물','가공품','음식'])expect(screen.getByRole('button',{name,exact:true})).toBeTruthy()
 click('전체');click('밀 판매')
 expect(document.querySelector('.farm-sale-effect')?.textContent).toContain('+ 84 G')
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('15,084')
 expect(playSaleSound).toHaveBeenCalledTimes(1)
 expect(screen.getByRole('button',{name:'밀 판매'})).toHaveProperty('disabled',true)
 act(()=>vi.advanceTimersByTime(1800));expect(document.querySelector('.farm-sale-effect')).toBeNull()
 click('음식');expect(screen.getByRole('button',{name:'버터 선택'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'밀가루 선택'})).toBeNull()
 click('가공품');expect(screen.getByRole('button',{name:'밀가루 선택'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'버터 선택'})).toBeNull()
 click('Close');click('상점')
 const shop=screen.getByRole('dialog',{name:'상점'})
 for(const name of ['종자 상점','판매소']){expect(within(shop).getByRole('article',{name})).toBeTruthy();expect(within(shop).queryByRole('button',{name:new RegExp('^'+name+' 구매 ·')})).toBeNull()}
 for(const name of ['장터','가공품 판매소'])expect(within(shop).queryByRole('article',{name})).toBeNull()
})
it('submits a dairy product from the food category without losing its selected quantity',()=>{
 const state=initialTopview(),onAction=vi.fn();state.simulation.inventory.cheese=3
 render(<FarmTradePanel kind="store" state={state} onAction={onAction}/>)
 click('음식');click('치즈 선택');click('전체');click('치즈 판매')
 expect(onAction).toHaveBeenCalledWith({type:'marketSell',good:'cheese',quantity:3})
})
