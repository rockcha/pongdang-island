import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview} from '@/features/farm/topview-model'
import {farmBuildingStorageError,simulateFarm} from '@/features/farm/farm-simulation'

afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('stores only idle buildings, preserves levels and cannot store the same object twice',()=>{
 const state=initialTopview();state.objects=state.objects.map(o=>o.id===1?{...o,level:3}:o)
 const stored=simulateFarm(state,1,{type:'storeBuilding'},0).state
 expect(stored.objects.some(o=>o.id===1)).toBe(false);expect(stored.stored).toEqual(['office'])
 expect(stored.storedLevels?.office).toEqual([3]);expect(stored.gold).toBe(state.gold)
 expect(simulateFarm(stored,1,{type:'storeBuilding'},0).state).toBe(stored)
 expect(simulateFarm(state,4,{type:'storeBuilding'},0).state).toBe(state)
})
it('rejects research, upgrades, preparation, unclaimed animals, active and unclaimed processing',()=>{
 const state=initialTopview()
 const research=simulateFarm(state,20,{type:'research',crop:'potato'},0).state
 const upgrade=simulateFarm(state,1,{type:'upgrade'},0).state
 const animal=simulateFarm(state,18,{type:'animal',animal:'chicken'},0).state
 const mill=simulateFarm(state,21,{type:'mill',quantity:1},0).state
 const crafting=initialTopview();crafting.simulation.inventory.milk=2
 const dairy=simulateFarm(crafting,24,{type:'craft',recipe:'butter',quantity:1},0).state
 for(const [before,id] of [[research,20],[upgrade,1],[animal,18],[mill,21],[dairy,24]] as const){
  expect(farmBuildingStorageError(before,id)).not.toBeNull()
  expect(simulateFarm(before,id,{type:'storeBuilding'},500).state).toBe(before)
  expect(simulateFarm(before,id,{type:'storeBuilding'},20000).state).toBe(before)
 }
 const claimed=simulateFarm(mill,21,{type:'collectFlour'},10000).state
 expect(farmBuildingStorageError(claimed,21)).toBeNull()
})
it('protects warehouse stock, reserved harvests, plot capacity and stored/pending animal capacity',()=>{
 const state=initialTopview()
 expect(farmBuildingStorageError(state,26)).not.toBeNull()
 for(const good of Object.keys(state.simulation.inventory))state.simulation.inventory[good as keyof typeof state.simulation.inventory]=0
 expect(farmBuildingStorageError(state,26)).toBeNull()
 state.simulation.cropJobs[10]={crop:'potato',readyAt:0,harvestingAt:1}
 expect(farmBuildingStorageError(state,26)).not.toBeNull()
 expect(farmBuildingStorageError(state,1,1)).not.toBeNull()
 state.stored.push('cow')
 expect(farmBuildingStorageError(state,3)).not.toBeNull()
})
it('offers storing an idle building directly from its dialog and returns it to the placement inventory',()=>{
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('종자 상점 (8,5)');expect(screen.getByRole('button',{name:'보관하기'}).getAttribute('aria-disabled')).toBe('false')
 click('보관하기');expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.queryByRole('button',{name:'종자 상점 (8,5)'})).toBeNull()
 click('보관함');fireEvent.click(screen.getByRole('button',{name:/종자 상점.*보관 1개.*배치하기/}))
 fireEvent.click(document.querySelector('[data-farm-cell="8,5"]')!);click('이동하기')
 expect(screen.getByRole('button',{name:'종자 상점 (8,5)'})).toBeTruthy()
})
it('keeps storage disabled for a finished but unclaimed mill batch and enables it after claiming',()=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('제분소 (6,12)');click('밀 제분 시작');expect(screen.queryByRole('dialog')).toBeNull();click('제분소 (6,12)')
 click('보관하기');expect(screen.getByText('제분이 끝나고 밀가루를 받은 뒤 보관할 수 있어요.')).toBeTruthy()
 expect(screen.getByRole('button',{name:'보관하기'}).getAttribute('aria-disabled')).toBe('true')
 act(()=>vi.advanceTimersByTime(10000))
 expect(screen.getByRole('button',{name:'보관하기'}).getAttribute('aria-disabled')).toBe('true')
 click('수령하기');click('제분소 (6,12)');expect(screen.getByRole('button',{name:'보관하기'}).getAttribute('aria-disabled')).toBe('false')
 click('보관하기');expect(screen.queryByRole('button',{name:'제분소 (6,12)'})).toBeNull()
})
