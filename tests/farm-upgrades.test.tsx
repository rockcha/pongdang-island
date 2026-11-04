import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,farmLimits} from '@/features/farm/farm-simulation'
import {buildingCapacity,warehouseCapacity,warehouseAvailable} from '@/features/farm/building-upgrades'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('upgrades both upgradeable building types through ten levels for 50G and exactly ten seconds per level',()=>{
 for(const [id,step] of [[26,10],[1,4]]){
  let state=initialTopview(),now=0
  for(let level=1;level<10;level++){
   expect(buildingCapacity(state.objects.find(o=>o.id===id)!)).toBe(step*level)
   const old=state;state=simulateFarm(state,id,{type:'upgrade'},now).state
   expect(state.gold).toBe(old.gold-50)
   expect(simulateFarm(state,id,{type:'upgrade'},now).state).toBe(state)
   expect(simulateFarm(state,id,{type:'completeUpgrade'},now+9999).state).toBe(state)
   now+=10000;state=simulateFarm(state,id,{type:'completeUpgrade'},now).state
   expect(state.objects.find(o=>o.id===id)?.level).toBe(level+1)
   expect(simulateFarm(state,id,{type:'completeUpgrade'},now).state).toBe(state)
  }
  expect(state.gold).toBe(14550)
  expect(buildingCapacity(state.objects.find(o=>o.id===id)!)).toBe(step*10)
  expect(simulateFarm(state,id,{type:'upgrade'},now).state).toBe(state)
 }
})
it('locks warehouse inventory transactions during upgrade, preserves stock, and refunds cancellation only once',()=>{
 const before=initialTopview(),state=simulateFarm(before,26,{type:'upgrade'},0).state
 expect(warehouseAvailable(state)).toBe(false)
 for(const [id,action] of [[2,{type:'sell',good:'wheat',quantity:1,orderDay:'1970-01-01'}],[21,{type:'mill',quantity:1}],[4,{type:'feed'}]] as const)expect(simulateFarm(state,id,action,1000).state).toBe(state)
 expect(state.simulation.inventory.wheat).toBe(12)
 const cancelled=simulateFarm(state,26,{type:'cancelUpgrade'},9999).state
 expect(cancelled.gold).toBe(before.gold);expect(warehouseCapacity(cancelled)).toBe(10)
 expect(simulateFarm(cancelled,26,{type:'cancelUpgrade'},10000).state).toBe(cancelled)
 expect(simulateFarm(state,26,{type:'cancelUpgrade'},10000).state).toBe(state)
 expect(simulateFarm({...before,gold:49},26,{type:'upgrade'},0).state.gold).toBe(49)
})
it('suspends only the upgrading management building capacity while keeping all existing plots and animals',()=>{
 const before=initialTopview(),state=simulateFarm(before,1,{type:'upgrade'},0).state
 expect(farmLimits(state)).toMatchObject({plots:4,usedPlots:4,animals:4})
 expect(state.objects).toEqual(before.objects)
 const completed=simulateFarm(state,1,{type:'completeUpgrade'},10000).state
 expect(farmLimits(completed).plots).toBe(12)
 expect(farmLimits({...completed,objects:[...completed.objects,{id:90,kind:'barn',x:4,y:7}]}).animals).toBe(6)
})
it('keeps another warehouse usable and combines its capacity with completed building levels',()=>{
 const before=initialTopview();before.objects.push({id:50,kind:'warehouse',x:4,y:7,level:2})
 expect(warehouseCapacity(before)).toBe(30)
 const state=simulateFarm(before,26,{type:'upgrade'},0).state
 expect(warehouseAvailable(state)).toBe(true);expect(warehouseCapacity(state)).toBe(20)
 expect(simulateFarm(state,4,{type:'feed'},1000).state.simulation.inventory.wheat).toBe(11)
})
it('shows the warehouse hammer and progress, hides inventory while upgrading, and completes after leaving the dialog',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('창고 (18,5)');expect(screen.getByText('1 / 10칸')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:/창고 확장/}));click('업그레이드 · 50 G')
 expect(screen.getByRole('progressbar',{name:'건물 업그레이드 진행'})).toBeTruthy()
 expect(container.querySelector('[data-building-upgrade="26"]')).toBeTruthy()
 expect(document.querySelector('.farm-warehouse-grid')).toBeNull()
 act(()=>vi.advanceTimersByTime(5000))
 expect(screen.getByRole('progressbar',{name:'건물 업그레이드 진행'}).getAttribute('aria-valuenow')).toBe('50')
 click('업그레이드 취소');expect(screen.getByText('1 / 10칸')).toBeTruthy()
 click('업그레이드 · 50 G');click('Close');act(()=>vi.advanceTimersByTime(10000))
 expect(container.querySelector('[data-building-upgrade="26"]')).toBeNull()
 click('창고 (18,5)');expect(screen.getByText('1 / 20칸')).toBeTruthy()
 expect(document.querySelectorAll('.farm-warehouse-slot')).toHaveLength(1)
})
it('preserves an upgraded building level after recovery and placement',()=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('농지 관리소 (6,5)');click('업그레이드 · 50 G');act(()=>vi.advanceTimersByTime(10000));click('Close');act(()=>vi.advanceTimersByTime(200))
 click('편집하기');click('농지 관리소 (6,5)');click('회수');click('보관함')
 fireEvent.click(screen.getByRole('button',{name:/농지 관리소.*보관 1개/}))
 fireEvent.click(document.querySelector('[data-farm-cell="6,5"]')!);click('편집하기');click('농지 관리소 (6,5)')
 expect(screen.getByText('Lv. 2')).toBeTruthy()
})
