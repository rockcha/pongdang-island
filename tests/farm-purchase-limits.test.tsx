import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview,topviewItems,type FarmTool} from '@/features/farm/topview-model'
import {farmCanPurchase,farmLimits,farmPlacementError,simulateFarm} from '@/features/farm/farm-simulation'

afterEach(cleanup)
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('counts placed, stored, preparing and ready unclaimed animals before charging or starting another purchase',()=>{
 const state=initialTopview();state.stored=['chicken']
 const pending=simulateFarm(state,18,{type:'animal',animal:'chicken'},1000).state
 expect(farmLimits(pending)).toMatchObject({usedAnimals:2,storedAnimals:1,pendingAnimals:1,totalAnimals:4,animals:4})
 expect(simulateFarm(pending,3,{type:'animal',animal:'cow'},1000).state).toBe(pending)
 expect(simulateFarm(pending,3,{type:'animal',animal:'cow'},30000).state).toBe(pending)
 expect(pending.gold).toBe(14700)
 const claimed=simulateFarm(pending,18,{type:'completeAnimalPurchase'},11000).state
 expect(farmLimits(claimed)).toMatchObject({totalAnimals:4,storedAnimals:2,pendingAnimals:0})
 expect(simulateFarm(claimed,3,{type:'animal',animal:'cow'},11000).state).toBe(claimed)
 expect(farmPlacementError(claimed,'chicken',{fromStorage:true})).toBeNull()
})
it('limits each building to one placed or stored copy while allowing existing storage to be placed',()=>{
 const state=initialTopview()
 for(const kind of Object.keys(topviewItems) as FarmTool[]){
  if(topviewItems[kind].group!=='건물')continue
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
it('disables owned building cards, including a stored building, while allowing that building to be placed from storage',()=>{
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('꾸미기');click('건물')
 const palette=container.querySelector('.top-farm-palette')!,cards=within(palette as HTMLElement).getAllByRole('button').filter(button=>button.hasAttribute('data-owned'))
 expect(cards.length).toBe(12)
 for(const button of cards){expect(button).toHaveProperty('disabled',true);expect(button.textContent).toContain('보유 중');expect(button.getAttribute('data-owned')).toBe('true')}
 click('목록 닫기');click('둘러보기');click('종자 상점 (8,5)');click('회수')
 click('건물');expect(within(container.querySelector('.top-farm-palette') as HTMLElement).getByRole('button',{name:/종자 상점.*보유 중/})).toHaveProperty('disabled',true)
 click('보관함');fireEvent.click(screen.getByRole('button',{name:/종자 상점.*보관 1개/}));fireEvent.click(container.querySelector('[data-farm-cell="8,5"]')!)
 expect(screen.getByRole('button',{name:'종자 상점 (8,5)'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('15,000')
})
