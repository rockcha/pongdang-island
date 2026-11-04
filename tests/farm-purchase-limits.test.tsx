import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview,topviewItems,type FarmTool} from '@/features/farm/topview-model'
import {farmCanPurchase,farmLimits,farmPlacementError,simulateFarm} from '@/features/farm/farm-simulation'

afterEach(cleanup)
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('reserves each species capacity while its next animal is preparing or waiting in storage',()=>{
 const state=initialTopview(),pending=simulateFarm(state,18,{type:'animal',animal:'chicken'},1000).state
 expect(farmLimits(pending)).toMatchObject({usedAnimals:2,storedAnimals:0,pendingAnimals:1,totalAnimals:3,animals:4})
 expect(simulateFarm(pending,18,{type:'animal',animal:'chicken'},30000).state).toBe(pending)
 const claimed=simulateFarm(pending,18,{type:'completeAnimalPurchase'},11000).state
 expect(farmLimits(claimed)).toMatchObject({totalAnimals:3,storedAnimals:1,pendingAnimals:0})
 expect(simulateFarm(claimed,18,{type:'animal',animal:'chicken'},11000).state).toBe(claimed)
 expect(simulateFarm(claimed,3,{type:'animal',animal:'cow'},11000).state).not.toBe(claimed)
 expect(farmPlacementError(claimed,'chicken',{fromStorage:true})).toBeNull()
})
it('limits each building to one placed or stored copy while allowing existing storage to be placed',()=>{
 const state=initialTopview()
 for(const kind of Object.keys(topviewItems) as FarmTool[]){
  if(topviewItems[kind].group!=='건물')continue
  if(topviewItems[kind].purchaseLimit===Infinity){expect(farmCanPurchase(state,kind)).toBe(true);continue}
  expect(farmCanPurchase(state,kind)).toBe(false)
  expect(farmPlacementError(state,kind)).toContain('이미 보유')
  const stored={...state,objects:state.objects.filter(o=>o.kind!==kind),stored:[kind]}
  expect(farmCanPurchase(stored,kind)).toBe(false)
  expect(farmPlacementError(stored,kind)).toContain('이미 보유')
  expect(farmPlacementError(stored,kind,{fromStorage:true})).toBeNull()
  expect(farmCanPurchase({...stored,stored:[]},kind)).toBe(true)
 }
 expect(farmCanPurchase(state,'tree')).toBe(true)
})
it('supports configuring a future building to allow multiple purchases',()=>{
 const state=initialTopview(),previous=topviewItems.office.purchaseLimit
 try{topviewItems.office.purchaseLimit=2;expect(farmCanPurchase(state,'office')).toBe(true);state.stored.push('office');expect(farmCanPurchase(state,'office')).toBe(false)}
 finally{topviewItems.office.purchaseLimit=previous}
})
it('hides purchase buttons for owned buildings while keeping their information accessible and storage placeable',()=>{
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('상점');click('건물')
 const palette=screen.getByRole('dialog',{name:'상점'}),cards=within(palette).getAllByRole('article')
 expect(cards.length).toBe(11)
 for(const card of cards){const owned=card.getAttribute('data-owned')==='true',buy=within(card).queryByRole('button',{name:/구매/});if(owned){expect(buy).toBeNull();expect(card.textContent).toContain('보유 중')}else{expect(buy).toHaveProperty('disabled',false);expect(card.textContent).toContain('여러 채 건설 가능')}}
 click('종자 상점 설명')
 const info=screen.getByRole('dialog',{name:'종자 상점 설명'})
 expect(within(info).getByRole('region',{name:'종자 상점 용도와 효과'}).textContent).toContain('종자를 구매')
 click('Close');expect(screen.getByRole('dialog',{name:'상점'})).toBeTruthy()
 click('Close');click('편집하기');click('종자 상점 (8,5)');click('회수')
 click('상점');expect(within(screen.getByRole('dialog',{name:'상점'})).queryByRole('button',{name:/종자 상점 구매/})).toBeNull()
 click('Close');click('보관함');fireEvent.click(screen.getByRole('button',{name:/종자 상점.*보관 1개/}));fireEvent.click(container.querySelector('[data-farm-cell="8,5"]')!)
 expect(screen.getByRole('button',{name:'종자 상점 (8,5)'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('15,000')
})
