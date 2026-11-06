import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {initialTopview,topviewItems,type FarmTool,type TopviewState} from '@/features/farm/topview-model'
import {basicFarmBuildings} from '@/features/farm/building-rules'
import {farmAnimals,farmAnimalKinds} from '@/features/farm/animal-catalog'
import {farmObjectResaleError,farmResalePrice,isResellableFarmKind,resellFarmObject,resellStoredFarmItem} from '@/features/farm/resale'
import {farmSupplies,farmSupplyKinds,withFarmSupplyInventory} from '@/features/farm/supply-catalog'
import {simulateFarm,farmStorageUsage,cropIsRotten} from '@/features/farm/farm-simulation'
import {farmCrops} from '@/features/farm/crop-catalog'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {FarmObjectStorage} from '@/features/farm/object-storage'
import {playSaleSound} from '@/features/gold/purchase-sound'
vi.mock('@/features/gold/purchase-sound',()=>({playSaleSound:vi.fn(),playPurchaseSound:vi.fn()}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
const resaleKinds=(Object.keys(topviewItems) as FarmTool[]).filter(isResellableFarmKind)
const withObject=(kind:FarmTool)=>{const state=initialTopview();state.objects.push({id:90,kind,x:14,y:13});return state}

it.each(resaleKinds)('sells inactive %s for half its catalog price once, preserving inventory',kind=>{
 const state=withObject(kind),sold=resellFarmObject(state,90)
 expect(sold.state.gold).toBe(state.gold+Math.floor(topviewItems[kind].price/2))
 expect(sold.state.objects.some(o=>o.id===90)).toBe(false)
 expect(sold.state.simulation).toBe(state.simulation)
 expect(sold.receipt).toEqual({kind,quantity:1,gold:farmResalePrice(kind)})
 expect(resellFarmObject(sold.state,90).state).toBe(sold.state)
})
it.each(basicFarmBuildings)('protects basic %s in both the map and object storage',kind=>{
 const state=initialTopview(),object=state.objects.find(o=>o.kind===kind)!
 expect(resellFarmObject(state,object.id).state).toBe(state)
 state.stored.push(kind)
 expect(resellStoredFarmItem(state,kind).state).toBe(state)
})
it.each(resaleKinds)('sells one stored %s copy and keeps the remaining copy metadata aligned',kind=>{
 const state=initialTopview();state.stored=[kind,'flowers',kind]
 state.storedTransforms={[kind]:[{flipped:true},{flipped:false}]};state.storedLevels={[kind]:[1,3]}
 const sold=resellStoredFarmItem(state,kind).state
 expect(sold.stored).toEqual(['flowers',kind]);expect(sold.storedTransforms?.[kind]).toEqual([{flipped:false}]);expect(sold.storedLevels?.[kind]).toEqual([3])
 expect(sold.objects).toBe(state.objects);expect(sold.gold).toBe(state.gold+farmResalePrice(kind))
})
it.each(farmAnimalKinds)('blocks a producing or unclaimed %s, then permits sale after collection',kind=>{
 const state=withObject(kind);state.simulation.animalJobs[90]=1000
 expect(resellFarmObject(state,90).state).toBe(state)
 const collected=simulateFarm(state,90,{type:'collectAnimal'},1000).state
 expect(collected.simulation.inventory[farmAnimals[kind].product]).toBe(1)
 expect(resellFarmObject(collected,90).state.gold).toBe(collected.gold+Math.floor(farmAnimals[kind].price/2))
})
it('protects active processing, research, preparing animals and the last needed animal housing',()=>{
 const dairy=withObject('dairy');dairy.simulation.processingJobs[90]={recipe:'butter',quantity:1,startedAt:0,readyAt:1000}
 expect(resellFarmObject(dairy,90).state).toBe(dairy)
 const mill=withObject('mill');mill.simulation.millJobs[90]={product:'flour',quantity:1,startedAt:0,readyAt:1000}
 expect(resellFarmObject(mill,90).state).toBe(mill)
 const lab=withObject('lab');lab.simulation.researchJob={crop:'potato',labId:90,startedAt:0,readyAt:1000}
 expect(resellFarmObject(lab,90).state).toBe(lab)
 const coop=withObject('coop');coop.simulation.animalPurchaseJobs[90]={animal:'chicken',startedAt:0,readyAt:1000}
 expect(resellFarmObject(coop,90).state).toBe(coop)
 coop.simulation.animalPurchaseJobs={};coop.stored=['chicken']
 expect(farmObjectResaleError(coop,90)).toContain('거처')
 coop.objects.push({id:91,kind:'coop',x:10,y:9})
 expect(resellFarmObject(coop,90).state).not.toBe(coop)
})
it('rejects decoration sales, empty storage and overflowing gold without changing state',()=>{
 const state=initialTopview();expect(resellFarmObject(state,9).state).toBe(state)
 expect(resellStoredFarmItem(state,'cow').state).toBe(state)
 const rich=withObject('cow');rich.gold=Number.MAX_SAFE_INTEGER
 expect(resellFarmObject(rich,90).state).toBe(rich)
 rich.stored=['cow'];expect(resellStoredFarmItem(rich,'cow').state).toBe(rich)
})
it.each(farmSupplyKinds)('buys %s outside warehouse capacity and refuses invalid or unaffordable batches',supply=>{
 const state=withObject('agriShop');state.simulation.inventory.wheat=30
 const bought=simulateFarm(state,90,{type:'buySupply',supply,quantity:3},0).state
 expect(bought.gold).toBe(state.gold-farmSupplies[supply].price*3)
 expect(bought.simulation.inventory[supply]).toBe(3);expect(farmStorageUsage(bought.simulation)).toBe(30)
 for(const quantity of [0,-1,1.5,NaN,Infinity,1001])expect(simulateFarm(state,90,{type:'buySupply',supply,quantity},0).state).toBe(state)
 expect(simulateFarm(state,23,{type:'buySupply',supply,quantity:1},0).state).toBe(state)
 const poor={...state,gold:farmSupplies[supply].price-1}
 expect(simulateFarm(poor,90,{type:'buySupply',supply,quantity:1},0).state).toBe(poor)
})
it('halves the remaining time once, allows premium afterwards and resets the flag for a new crop',()=>{
 let state=initialTopview();state.simulation.inventory.fertilizer=2;state.simulation.inventory.premiumFertilizer=1
 state.simulation.cropJobs[10]={crop:'wheat',readyAt:9001}
 state=simulateFarm(state,10,{type:'fertilize',supply:'fertilizer'},1000).state
 expect(state.simulation.cropJobs[10]).toMatchObject({readyAt:5001,fertilized:true})
 expect(state.simulation.inventory.fertilizer).toBe(1)
 expect(simulateFarm(state,10,{type:'fertilize',supply:'fertilizer'},1200).state).toBe(state)
 state=simulateFarm(state,10,{type:'fertilize',supply:'premiumFertilizer'},1600).state
 expect(state.simulation.cropJobs[10].readyAt).toBe(1600);expect(state.simulation.inventory.premiumFertilizer).toBe(0)
 expect(cropIsRotten(state.simulation.cropJobs[10],1600)).toBe(false)
 expect(state.simulation.inventory.wheat).toBe(12)
 state=simulateFarm(state,10,{type:'harvest'},1600).state
 expect(state.simulation.inventory.wheat).toBe(12+farmCrops.wheat.yield)
 state=simulateFarm(state,10,{type:'plant',crop:'wheat'},1600).state
 expect(state.simulation.cropJobs[10].fertilized).toBeUndefined()
 expect(simulateFarm(state,10,{type:'fertilize',supply:'fertilizer'},1600).state.simulation.inventory.fertilizer).toBe(0)
})
it('does not consume fertilizer on an empty, mature, rotten or harvesting plot, or on another object',()=>{
 const state=initialTopview();state.simulation.inventory.fertilizer=5;state.simulation.inventory.premiumFertilizer=5
 for(const supply of farmSupplyKinds){
  expect(simulateFarm(state,10,{type:'fertilize',supply},1000).state).toBe(state)
  expect(simulateFarm(state,1,{type:'fertilize',supply},1000).state).toBe(state)
  for(const job of [{crop:'wheat' as const,readyAt:1000},{crop:'wheat' as const,readyAt:-60000},{crop:'wheat' as const,readyAt:5000,harvestingAt:0}]){state.simulation.cropJobs[10]=job;expect(simulateFarm(state,10,{type:'fertilize',supply},1000).state).toBe(state)}
 }
})
it('initializes supplies for a farm opened before this feature without changing its gold or crop jobs',()=>{
 const state=initialTopview();delete (state.simulation.inventory as Partial<typeof state.simulation.inventory>).fertilizer
 const migrated=withFarmSupplyInventory(state)
 expect(migrated.simulation.inventory.fertilizer).toBe(0);expect(migrated.gold).toBe(state.gold);expect(migrated.simulation.cropJobs).toBe(state.simulation.cropJobs)
 expect(withFarmSupplyInventory(migrated)).toBe(migrated)
})
it('offers a separate storage sale button without triggering placement, and hides it for basic buildings',()=>{
 const state=initialTopview();state.stored=['dairy','warehouse'];const onSell=vi.fn(),onPlace=vi.fn()
 render(<FarmObjectStorage state={state} category="건물" selected={null} onCategory={()=>{}} onPlace={onPlace} onSell={onSell} onDone={()=>{}}/>)
 click('유제품 공방 보관 개체 반값 판매')
 expect(onSell).toHaveBeenCalledWith('dairy');expect(onPlace).not.toHaveBeenCalled()
 expect(screen.queryByRole('button',{name:'창고 보관 개체 반값 판매'})).toBeNull()
})

function buyPlace(name:string,price:number,x:number,y:number){
 click('상점');click(name+' 구매 · '+price+' G');click('Close');click('보관함');click('건물');click(name+' 보관 1개 배치하기')
 fireEvent.click(document.querySelector('[data-farm-cell="'+x+','+y+'"]')!);click('완료')
}
it('buys supplies, applies them to one planted tile through the farming menu and sells the idle supply shop',()=>{
 vi.useFakeTimers();vi.setSystemTime(1000);render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 buyPlace('농업용품점',1500,8,9);click('농업용품점 (8,9)');click('비료 구매');click('고급 비료 선택');click('고급 비료 구매');click('Close')
 click('밭 (9,13)');click('밀 심기');click('농사');click('비료 사용');click('밭 (9,13)')
 expect(screen.getByRole('progressbar',{name:'밀 성장 (9,13)'})).toHaveProperty('ariaValueNow','50')
 expect(document.querySelector('[data-fertilizer-effect="fertilizer"]')).toBeTruthy()
 expect(screen.getByRole('button',{name:'비료 사용'})).toHaveProperty('disabled',true)
 click('고급 비료 사용');click('밭 (9,13)')
 expect(screen.getByRole('progressbar',{name:'밀 성장 (9,13)'})).toHaveProperty('ariaValueNow','100')
 expect(document.querySelector('[data-fertilizer-effect="premiumFertilizer"]')).toBeTruthy()
 click('완료');click('농업용품점 (8,9)');click('농업용품점 반값 판매')
 expect(screen.queryByRole('button',{name:'농업용품점 (8,9)'})).toBeNull()
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('13,920')
 expect(document.querySelector('[data-farm-resale]')?.textContent).toContain('+ 750 G')
 expect(playSaleSound).toHaveBeenCalledTimes(1)
 act(()=>vi.advanceTimersByTime(1800));expect(document.querySelector('[data-farm-resale]')).toBeNull()
})
it('disables the placed animal sale while production is active or unclaimed, then sells after collection',()=>{
 vi.useFakeTimers();vi.setSystemTime(1000);render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 buyPlace('가금사',2500,10,9);click('가금사 (10,9)');click('닭 구매 · 1,200 G');act(()=>vi.advanceTimersByTime(10000));click('닭 보관함으로 받기')
 click('보관함');click('동물');click('닭 보관 1개 배치하기');fireEvent.click(document.querySelector('[data-farm-cell="14,10"]')!);click('완료')
 click('닭 (14,10)');expect(screen.getByRole('button',{name:'동물 반값 판매'})).toHaveProperty('disabled',false)
 click('닭 생산 시작');expect(screen.getByRole('button',{name:'동물 반값 판매'})).toHaveProperty('disabled',true)
 act(()=>vi.advanceTimersByTime(10000));expect(screen.getByRole('button',{name:'동물 반값 판매'})).toHaveProperty('disabled',true)
 click('달걀 생산 (14,10)');click('동물 반값 판매')
 expect(screen.queryByRole('button',{name:'닭 (14,10)'})).toBeNull();expect(document.querySelector('.top-farm-gold')?.textContent).toContain('11,900')
})
