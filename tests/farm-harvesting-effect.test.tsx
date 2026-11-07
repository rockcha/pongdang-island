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
  return state
 }}
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
 expect(screen.getByRole('img',{name:/창고 15 \/ 40/})).toBeTruthy()
})
