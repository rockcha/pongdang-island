import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {farmAnimalHousing,farmBuildingStorageError,farmLimits,farmPlacementError,simulateFarm} from '@/features/farm/farm-simulation'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(()=>{cleanup();vi.useRealTimers()})
it('shares slots across animals, reserves pending and stored animals, and unlocks new slots only after an upgrade completes',()=>{
 let state=initialTopview()
 state=simulateFarm(state,3,{type:'animal',animal:'sheep'},0).state
 state=simulateFarm(state,18,{type:'animal',animal:'duck'},0).state
 expect(farmLimits(state)).toMatchObject({animals:4,totalAnimals:4,pendingAnimals:2})
 state=simulateFarm(state,3,{type:'completeAnimalPurchase'},10000).state
 state=simulateFarm(state,18,{type:'completeAnimalPurchase'},10000).state
 expect(farmLimits(state)).toMatchObject({totalAnimals:4,storedAnimals:2,pendingAnimals:0})
 expect(simulateFarm(state,3,{type:'animal',animal:'cow'},10000).state).toBe(state)
 expect(farmPlacementError(state,'cow')).toContain('축산 관리소')
 state=simulateFarm(state,27,{type:'upgrade'},10000).state
 expect(farmLimits(state).animals).toBe(4)
 expect(simulateFarm(state,3,{type:'animal',animal:'cow'},19999).state).toBe(state)
 state=simulateFarm(state,27,{type:'completeUpgrade'},20000).state
 expect(farmLimits(state).animals).toBe(6)
 expect(simulateFarm(state,3,{type:'animal',animal:'cow'},20000).state).not.toBe(state)
 expect(farmAnimalHousing(state,'cow').capacity).toBe(farmAnimalHousing(state,'chicken').capacity)
})
it('protects capacity when recovering the office and retains its upgraded level in storage',()=>{
 const state=initialTopview();state.objects.find(o=>o.id===27)!.level=2
 state.stored.push('duck')
 expect(farmBuildingStorageError(state,27)).toContain('동물 정원')
 expect(simulateFarm(state,27,{type:'storeBuilding'},0).state).toBe(state)
 state.stored=[]
 const stored=simulateFarm(state,27,{type:'storeBuilding'},0).state
 expect(stored.storedLevels?.livestockOffice).toEqual([2])
 expect(farmLimits(stored).animals).toBe(2)
 stored.objects.push({id:50,kind:'livestockOffice',x:4,y:7,level:stored.storedLevels!.livestockOffice![0]})
 expect(farmLimits(stored).animals).toBe(6)
})
it('still requires the matching housing and does not expand capacity by adding houses',()=>{
 const state=initialTopview();state.objects.push({id:50,kind:'barn',x:4,y:9},{id:51,kind:'coop',x:6,y:9})
 expect(farmLimits(state).animals).toBe(4)
 state.objects=state.objects.filter(o=>o.kind!=='barn')
 expect(farmPlacementError(state,'sheep')).toContain('축사')
})
it('shows production time and price inside each card and links the shared capacity to office upgrades',()=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
 click('축사 (15,6)')
 for(const [animal,price] of [['젖소','800 G'],['양','600 G']]){
  const card=screen.getByRole('button',{name:`${animal} 선택`})
  expect(within(card).getByText(price)).toBeTruthy()
  expect(within(card).getByLabelText(`${animal} 1회 생산 시간 10초`)).toBeTruthy()
 }
 expect(screen.getByLabelText('사육 정원 2 / 4마리 · 보관·준비 중 포함')).toBeTruthy()
 click('축산 관리소로 이동')
 expect(screen.getByRole('heading',{name:'축산 관리소',exact:true})).toBeTruthy()
 expect(screen.getByText('2 / 4마리')).toBeTruthy()
 click('업그레이드 · 50 G');act(()=>vi.advanceTimersByTime(10000))
 expect(screen.getByText('Lv. 2')).toBeTruthy()
 click('Close');click('축사 (15,6)')
 expect(screen.getByLabelText('사육 정원 2 / 6마리 · 보관·준비 중 포함')).toBeTruthy()
})
