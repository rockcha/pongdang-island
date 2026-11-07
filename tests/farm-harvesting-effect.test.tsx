import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {farmHarvestingArt} from '@/features/farm/harvesting-effect'

vi.mock('@/features/farm/trial-inventory',async importOriginal=>{
 const original=await importOriginal<typeof import('@/features/farm/trial-inventory')>()
 return {...original,initialFarmTrial:()=>{
  const state=original.initialFarmTrial()
  state.simulation.cropJobs[10]={crop:'wheat',readyAt:0}
  state.simulation.cropJobs[11]={crop:'carrot',readyAt:0}
  state.objects.push({id:102,kind:'cow',x:8,y:7})
  state.simulation.animalJobs[102]=0
  return state
 }}
})
it('can immediately start harvesting a second plot while the first receipt remains visible',async()=>{
 vi.useFakeTimers();vi.setSystemTime(1000)
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 await act(async()=>{fireEvent.click(container.querySelector('[data-object-id="10"]')!)})
 await act(async()=>{vi.advanceTimersByTime(3001)})
 expect(container.querySelector('[data-harvest-receipt="wheat"]')).toBeTruthy()
 await act(async()=>{fireEvent.click(container.querySelector('[data-object-id="11"]')!)})
 expect(container.querySelector('[data-harvesting-effect="11,11"]')).toBeTruthy()
 expect(container.querySelector('[data-farm-effect="harvest"]')).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(3001)})
 expect(container.querySelector('[data-harvest-receipt="carrot"]')?.textContent).toContain('+4')
})
it('uses the same small receipt for animal products',async()=>{
 vi.useFakeTimers();vi.setSystemTime(1000)
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'우유 생산 (8,7)'}))})
 expect(container.querySelector('[data-harvest-receipt="milk"]')?.textContent).toContain('+2')
 expect(container.querySelector('[data-farm-effect="harvest"]')).toBeNull()
 expect(container.querySelector('[data-animal-status="idle"]')).toBeNull()
 expect(container.querySelector('.farm-sleep-letters')).toBeNull()
 await act(async()=>{fireEvent.click(container.querySelector('[data-object-id="102"]')!)})
 expect(container.querySelector('[data-animal-status="producing"]')).toBeTruthy()
})
afterEach(()=>{cleanup();vi.useRealTimers()})
it('shows painted sickle and dust only while harvesting, then receives the crop',async()=>{
 vi.useFakeTimers();vi.setSystemTime(1000)
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 expect(container.querySelector('[data-harvesting-effect]')).toBeNull()
 await act(async()=>{fireEvent.click(container.querySelector('[data-object-id="10"]')!)})
 const effect=container.querySelector('[data-harvesting-effect="10,11"]')!
 expect(effect).toBeTruthy()
 expect(effect.getAttribute('pointer-events')).toBe('none')
 expect(effect.querySelector('.farm-harvesting-sickle image')?.getAttribute('href')).toBe(farmHarvestingArt)
 expect(effect.querySelector('.farm-harvesting-puff image')).toBeTruthy()
 expect(container.querySelector('.farm-harvest-scythe')).toBeNull()
 expect(screen.getByRole('img',{name:/창고 15 \/ 40/})).toBeTruthy()
 await act(async()=>{vi.advanceTimersByTime(3001)})
 expect(container.querySelector('[data-harvesting-effect]')).toBeNull()
 expect(container.querySelector('[data-harvesting]')).toBeNull()
 expect(container.querySelector('[data-farm-effect="harvest"]')).toBeNull()
 const receipt=container.querySelector('[data-harvest-receipt="wheat"]')!
 expect(receipt.getAttribute('pointer-events')).toBe('none')
 expect(receipt.querySelector('image')).toBeTruthy()
 expect(receipt.textContent).toContain('+3')
 expect(screen.getByRole('img',{name:/창고 15 \/ 40/})).toBeTruthy()
 await act(async()=>{vi.advanceTimersByTime(1201)})
 expect(container.querySelector('[data-harvest-receipt]')).toBeNull()
})
