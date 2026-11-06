import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {initialTopview,type FarmTool,type TopviewState} from '@/features/farm/topview-model'
import {simulateFarm,farmBuildingStorageError,farmGoods} from '@/features/farm/farm-simulation'
import {farmCrops,cropArt} from '@/features/farm/crop-catalog'
import {farmRecipes,finishedHouseholdGoods,finishedFoods,isDeliverableGood,isFinishedFood,deliverableGoods} from '@/features/farm/food-catalog'
import {textileProducts,textileRecipes} from '@/features/farm/textile-catalog'
import {FoodSalePanel} from '@/features/farm/food-sale-panel'
import {FarmCookbook} from '@/features/farm/cookbook'
import {FarmWarehouse} from '@/features/farm/warehouse'
import {ProcessingWorkshop} from '@/features/farm/processing-workshop'
import {plotGrowthImage} from '@/features/farm/plot-art'
import {farmShopCategory} from '@/features/farm/shop-categories'
import {goodsForDelivery} from '@/features/farm/market-catalog'

afterEach(cleanup)
function facilities(){const s=initialTopview();for(const [i,kind] of (['textileMill','sewingWorkshop','lab','sheep','barn'] as FarmTool[]).entries())s.objects.push({id:100+i,kind,x:5,y:8});return s}
function collect(state:TopviewState,id:number){return simulateFarm(state,id,{type:'collectCraft'},state.simulation.processingJobs[id].readyAt).state}

it('researches cotton once, buys seeds, grows it, then turns one harvest into two towels and sells once',()=>{
 let s=facilities();s.objects.find(o=>o.id===100)!.level=2
 expect(simulateFarm(s,23,{type:'seed',good:'cottonSeed',quantity:1},0).state).toBe(s)
 s=simulateFarm(s,102,{type:'research',crop:'cotton'},0).state
 expect(simulateFarm(s,102,{type:'completeResearch'},1799999).state).toBe(s)
 s=simulateFarm(s,102,{type:'completeResearch'},1800000).state
 expect(s.simulation.unlockedCrops).toContain('cotton')
 expect(simulateFarm(s,102,{type:'research',crop:'cotton'},1800000).state).toBe(s)
 s=simulateFarm(s,23,{type:'seed',good:'cottonSeed',quantity:1},1800000).state
 s=simulateFarm(s,10,{type:'plant',crop:'cotton'},1800000).state
 expect(simulateFarm(s,10,{type:'harvest'},5399999).state).toBe(s)
 s=simulateFarm(s,10,{type:'harvest'},5400000).state
 expect(s.simulation.inventory.cotton).toBe(8)
 s=simulateFarm(s,100,{type:'craft',recipe:'cottonFabric',quantity:4},5400000).state
 expect(s.simulation.inventory.cotton).toBe(0)
 expect(s.simulation.processingJobs[100].readyAt).toBe(10800000)
 s=collect(s,100)
 s=simulateFarm(s,101,{type:'craft',recipe:'towel',quantity:2},10800000).state
 expect(s.simulation.inventory.cottonFabric).toBe(0)
 s=collect(s,101)
 const before=s.gold
 s=simulateFarm(s,2,{type:'marketSell',good:'towel',quantity:2},14400000).state
 expect(s.gold).toBe(before+320)
 expect(s.simulation.inventory.towel).toBe(0)
 expect(simulateFarm(s,2,{type:'marketSell',good:'towel',quantity:1},14400000).state).toBe(s)
})

it('feeds a sheep, collects wool, spins yarn and sews a scarf without consuming the sheep',()=>{
 let s=facilities()
 s=simulateFarm(s,103,{type:'feed'},0).state
 expect(s.simulation.inventory.wheat).toBe(11)
 s=simulateFarm(s,103,{type:'collectAnimal'},3600000).state
 expect(s.simulation.inventory.wool).toBe(2)
 s=simulateFarm(s,100,{type:'craft',recipe:'woolYarn',quantity:1},3600000).state
 s=collect(s,100)
 s=simulateFarm(s,103,{type:'feed'},5400000).state
 s=simulateFarm(s,103,{type:'collectAnimal'},9000000).state
 s=simulateFarm(s,100,{type:'craft',recipe:'woolYarn',quantity:1},9000000).state
 s=collect(s,100)
 s=simulateFarm(s,101,{type:'craft',recipe:'scarf',quantity:1},10800000).state
 s=collect(s,101)
 expect(s.simulation.inventory.scarf).toBe(1)
 expect(s.objects.some(o=>o.id===103&&o.kind==='sheep')).toBe(true)
})

it.each(Object.keys(textileRecipes) as (keyof typeof textileRecipes)[])('reserves %s inputs once and rejects early or repeated collection',recipe=>{
 let s=facilities();const r=textileRecipes[recipe],id=r.building==='textileMill'?100:101
 for(const item of r.ingredients)s.simulation.inventory[item.good]=item.quantity*2
 const original=structuredClone(s)
 expect(simulateFarm(s,id===100?101:100,{type:'craft',recipe,quantity:1},0).state).toBe(s)
 s=simulateFarm(s,id,{type:'craft',recipe,quantity:2},0).state
 expect(original.simulation.processingJobs[id]).toBeUndefined()
 expect(s.simulation.processingJobs[id].readyAt).toBe(r.seconds*1000)
 for(const item of r.ingredients)expect(s.simulation.inventory[item.good]).toBe(0)
 expect(simulateFarm(s,id,{type:'craft',recipe,quantity:1},1).state).toBe(s)
 expect(farmBuildingStorageError(s,id)).toBeTruthy()
 expect(simulateFarm(s,id,{type:'collectCraft'},r.seconds*1000-1).state).toBe(s)
 s=collect(s,id)
 expect(s.simulation.inventory[recipe]).toBe(2)
 expect(simulateFarm(s,id,{type:'collectCraft'},r.seconds*1000+1).state).toBe(s)
})

it('keeps a finished textile job waiting when the warehouse is full',()=>{
 let s=facilities();s.simulation.inventory.cotton=4
 s=simulateFarm(s,100,{type:'craft',recipe:'cottonFabric',quantity:2},0).state
 s.simulation.inventory.wheat=120
 expect(simulateFarm(s,100,{type:'collectCraft'},2700000).state).toBe(s)
 s.simulation.inventory.wheat=118
 expect(collect(s,100).simulation.inventory.cottonFabric).toBe(2)
})

it('accepts only finished household goods, preserves food categories and rolls back mixed failed sales',()=>{
 const s=facilities()
 expect(finishedHouseholdGoods).toEqual(['towel','scarf','pongiDoll','blanket'])
 expect(finishedFoods).not.toContain('towel')
 for(const id of finishedHouseholdGoods){expect(isDeliverableGood(id)).toBe(true);expect(isFinishedFood(id)).toBe(false);s.simulation.inventory[id]=1}
 for(const id of ['cotton','wool','cottonFabric','woolYarn','felt'] as const){s.simulation.inventory[id]=1;expect(simulateFarm(s,2,{type:'marketSell',good:id,quantity:1},0).state).toBe(s)}
 expect(goodsForDelivery(s.simulation.inventory)).toEqual(finishedHouseholdGoods)
 const failed=simulateFarm(s,2,{type:'marketSellBatch',items:[{good:'towel',quantity:1},{good:'scarf',quantity:2}]},0)
 expect(failed.state).toBe(s)
 const done=simulateFarm(s,2,{type:'marketSellBatch',items:finishedHouseholdGoods.map(good=>({good,quantity:1}))},0).state
 expect(done.gold-s.gold).toBe(1300)
 expect(deliverableGoods.length).toBe(finishedFoods.length+4)
})

it('keeps household goods profitable, with long final production times and no zero-cost ingredient loop',()=>{
 const costs={cotton:5,wool:2,cottonFabric:10,woolYarn:4,felt:4}
 for(const id of finishedHouseholdGoods){const r=textileRecipes[id],cost=r.ingredients.reduce((sum,i)=>sum+costs[i.good]*i.quantity,0);expect(textileProducts[id].price).toBeGreaterThan(cost);expect(r.seconds).toBeGreaterThanOrEqual(3600);expect(r.seconds).toBeLessThanOrEqual(10800)}
 expect(farmCrops.cotton.seedPrice).toBe(farmCrops.cotton.yield*farmCrops.cotton.sellPrice)
 expect(farmShopCategory('textileMill','건물')).toBe('생활용품')
 expect(farmShopCategory('sewingWorkshop','건물')).toBe('생활용품')
})

it('shows sewing recipes and submits selected textile quantities',()=>{
 const s=facilities(),onAction=vi.fn();s.simulation.inventory.cotton=4
 render(<ProcessingWorkshop kind="textileMill" buildingId={100} simulation={s.simulation} now={0} onAction={onAction}/>)
 fireEvent.change(screen.getByRole('spinbutton',{name:'면직물 제작 수량'}),{target:{value:'2'}})
 fireEvent.click(screen.getByRole('button',{name:'면직물 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:'cottonFabric',quantity:2})
})

it('selects food and household goods across delivery tabs without losing either selection',()=>{
 const s=facilities(),onAction=vi.fn();s.simulation.inventory.towel=2;s.simulation.inventory.roastedCarrot=1
 render(<FoodSalePanel state={s} onAction={onAction}/>)
 fireEvent.click(screen.getByRole('button',{name:'구운 당근 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'생활용품',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'수건 선택'}))
 fireEvent.click(screen.getByRole('button',{name:/370\s*골드에 판매/}))
 expect(onAction).toHaveBeenCalledWith({type:'marketSellBatch',items:expect.arrayContaining([{good:'roastedCarrot',quantity:1},{good:'towel',quantity:2}])})
})

it('traces household recipes back to cotton and wool in the crafting encyclopedia',()=>{
 render(<FarmCookbook state={facilities()} onClose={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'생활용품',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'퐁이 인형 제작법'}))
 fireEvent.click(screen.getByRole('button',{name:'면직물 획득 방법'}))
 fireEvent.click(screen.getByRole('button',{name:'목화 획득 방법'}))
 expect(screen.getByText('밭에서 재배')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'전체 제작품'}))
 fireEvent.click(screen.getByRole('button',{name:'목도리 제작법'}))
 fireEvent.click(screen.getByRole('button',{name:'털실 획득 방법'}))
 fireEvent.click(screen.getByRole('button',{name:'양털 획득 방법'}))
 expect(screen.getByText('동물에게서 획득')).toBeTruthy()
})

it('separates finished household goods from fibers in the warehouse',()=>{
 const s=facilities();Object.assign(s.simulation.inventory,{towel:1,cottonFabric:2,wool:2,cotton:3})
 render(<FarmWarehouse state={s} simulation={s.simulation} onClose={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'생활용품',exact:true}))
 expect(screen.getByRole('button',{name:/수건/})).toBeTruthy()
 expect(screen.queryByRole('button',{name:/면직물/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'가공품',exact:true}))
 expect(screen.getByRole('button',{name:/면직물/})).toBeTruthy()
 expect(screen.queryByRole('button',{name:/수건/})).toBeNull()
})

it('publishes every new raster asset with alpha, stable hashes and correct cotton plot artwork',async()=>{
 const manifest=JSON.parse(readFileSync('assets/ui/farm-textiles-v1/manifest.json','utf8'))
 expect(manifest.entries).toHaveLength(11)
 for(const entry of manifest.entries){const bytes=readFileSync(entry.output),meta=await sharp(bytes).metadata();expect(meta.hasAlpha).toBe(true);expect(meta.width).toBe(entry.width);expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);expect(existsSync('assets/ui/farm-textiles-v1/'+entry.original)).toBe(true)}
 for(const id of Object.keys(textileProducts) as (keyof typeof textileProducts)[])expect(existsSync('public'+farmGoods[id].image)).toBe(true)
 expect(existsSync('public'+cropArt('cotton'))).toBe(true)
 expect(plotGrowthImage('ready','cotton')).toContain('cotton-ready.png')
 expect(farmRecipes.blanket.seconds).toBe(10800)
})
