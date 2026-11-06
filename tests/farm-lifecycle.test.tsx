import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,cropIsRotten} from '@/features/farm/farm-simulation'

afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('leaves a prepared animal waiting over the coop until tapped, then stores it exactly once',()=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('가금사 (10,9)');click('닭 구매 · 300 G');expect(screen.queryByRole('dialog')).toBeNull()
 act(()=>vi.advanceTimersByTime(30000))
 click('보관함');expect(screen.getByText('보관 중인 개체가 없어요.')).toBeTruthy();click('완료');act(()=>vi.advanceTimersByTime(200))
 expect(screen.getByRole('button',{name:'닭 보관함으로 받기'})).toBeTruthy()
 click('닭 보관함으로 받기')
 expect(screen.queryByRole('button',{name:'닭 보관함으로 받기'})).toBeNull()
 expect(screen.queryByRole('dialog')).toBeNull()
 click('보관함');click('동물');expect(screen.getByRole('button',{name:/닭.*보관 1개.*배치하기/})).toBeTruthy()
})
it('rots exactly sixty seconds after maturity, forbids harvesting and only discards rotten crops',()=>{
 const state=simulateFarm(initialTopview(),10,{type:'plant',crop:'wheat'},0).state
 expect(cropIsRotten(state.simulation.cropJobs[10],69999)).toBe(false)
 expect(cropIsRotten(state.simulation.cropJobs[10],70000)).toBe(true)
 expect(simulateFarm(state,10,{type:'discardCrop'},69999).state).toBe(state)
 expect(simulateFarm(state,10,{type:'beginHarvest'},70000).state).toBe(state)
 expect(simulateFarm(state,10,{type:'harvest'},70000).state).toBe(state)
 const discarded=simulateFarm(state,10,{type:'discardCrop'},70000).state
 expect(discarded.simulation.cropJobs[10]).toBeUndefined();expect(discarded.simulation.inventory.wheat).toBe(12)
 expect(simulateFarm(discarded,10,{type:'discardCrop'},70000).state).toBe(discarded)
})
it('reserves the last warehouse slot before harvesting and preserves a crop cut just before it would rot',()=>{
 const state=initialTopview(),inventory=state.simulation.inventory
 inventory.wheat=27
 state.simulation.cropJobs[10]={crop:'potato',readyAt:0};state.simulation.cropJobs[11]={crop:'carrot',readyAt:0};state.simulation.animalJobs[5]=1000
 const cutting=simulateFarm(state,10,{type:'beginHarvest'},9999).state
 expect(cutting).not.toBe(state)
 expect(simulateFarm(cutting,11,{type:'beginHarvest'},9999).state).toBe(cutting)
 expect(simulateFarm(cutting,5,{type:'collectAnimal'},9999).state).toBe(cutting)
 expect(cropIsRotten(cutting.simulation.cropJobs[10],12999)).toBe(false)
 expect(simulateFarm(cutting,10,{type:'harvest'},12998).state).toBe(cutting)
 const collected=simulateFarm(cutting,10,{type:'harvest'},12999).state
 expect(collected.simulation.inventory.potato).toBe(3)
 expect(collected.simulation.cropJobs[10]).toBeUndefined()
})
it('prepares animals once, reserves capacity while preparing, then produces only one waiting product per placed animal',()=>{
 const initial=initialTopview(),purchased=simulateFarm(initial,18,{type:'animal',animal:'chicken'},0).state
 expect(purchased.gold).toBe(14700);expect(purchased.stored).toEqual([])
 expect(simulateFarm(purchased,18,{type:'animal',animal:'chicken'},0).state).toBe(purchased)
 expect(simulateFarm(purchased,18,{type:'completeAnimalPurchase'},9999).state).toBe(purchased)
 const stored=simulateFarm(purchased,18,{type:'completeAnimalPurchase'},10000).state
 expect(stored.stored).toEqual(['chicken']);expect(stored.objects).toEqual(initial.objects)
 expect(simulateFarm(stored,18,{type:'completeAnimalPurchase'},10000).state).toBe(stored)
 const producing=simulateFarm(stored,4,{type:'startAnimal'},10000).state
 expect(producing.simulation.animalJobs[4]).toBe(20000)
 expect(simulateFarm(producing,4,{type:'collectAnimal'},19999).state).toBe(producing)
 const claimed=simulateFarm(producing,4,{type:'collectAnimal'},50000).state
 expect(claimed.simulation.inventory.milk).toBe(1);expect(claimed.simulation.animalJobs[4]).toBeUndefined()
 expect(simulateFarm(claimed,4,{type:'collectAnimal'},50000).state).toBe(claimed)
})
it('shows rotten crops with a discard action and resets the plot without adding warehouse goods',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('농사');click('씨앗 심기');click('밀 4개');click('밭 (9,13)');act(()=>vi.advanceTimersByTime(70000))
 expect(container.querySelector('[data-crop-rotten="10"]')).toBeTruthy()
 expect(container.querySelector('[data-crop-rotten="10"] .farm-status-ready')).toBeTruthy()
 click('폐기하기');expect(screen.getByText('폐기했어요')).toBeTruthy()
 expect(container.querySelector('[data-crop-rotten="10"]')).toBeNull()
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByText('밭을 깨끗하게 비웠어요.')).toBeTruthy()
 expect(container.querySelector('.top-farm-message')).toBeNull()
})
it('collects ready animal products immediately into the livestock tab and keeps only one waiting product',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('젖소 생산 시작');click('닭 생산 시작');act(()=>vi.advanceTimersByTime(40000))
 expect(container.querySelectorAll('[data-animal-status="ready"]')).toHaveLength(2)
 click('우유 생산 (16,9)');click('달걀 생산 (14,10)')
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(container.querySelectorAll('[data-animal-status="idle"]')).toHaveLength(2)
 click('창고 (18,6)');click('축산물')
 expect(screen.getByText('우유')).toBeTruthy();expect(screen.getByText('달걀')).toBeTruthy()
 expect(screen.getAllByText('×1')).toHaveLength(2)
})
