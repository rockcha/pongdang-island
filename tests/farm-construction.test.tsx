import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {finishFarmConstruction} from '@/features/farm/construction-model'
import {initialTopview} from '@/features/farm/topview-model'
import {activeBuildings} from '@/features/farm/building-upgrades'
import {simulateFarm,farmBuildingStorageError} from '@/features/farm/farm-simulation'
import {resellFarmObject} from '@/features/farm/resale'
import {transformFarmObject} from '@/features/farm/object-transform'

afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('reserves a building footprint, shows hammer progress and opens only after ten seconds',()=>{
 vi.useFakeTimers()
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('상점');click('제분소 구매 · 2000 G');click('Close');click('보관함')
 click('제분소 보관 1개 배치하기')
 fireEvent.click(container.querySelector('[data-farm-cell="8,8"]')!)
 expect(container.querySelector('[data-construction-effect]')).toBeTruthy()
 click('완료');click('제분소 (8,8)')
 expect(screen.queryByRole('dialog')).toBeNull()
 act(()=>vi.advanceTimersByTime(5000))
 expect(screen.getByRole('progressbar',{name:'제분소 건설 진행'}).getAttribute('aria-valuenow')).toBe('50')
 expect(screen.getByRole('button',{name:'한 단계 되돌리기'})).toHaveProperty('disabled',true)
 act(()=>vi.advanceTimersByTime(4999))
 expect(container.querySelector('[data-construction-effect]')).toBeTruthy()
 act(()=>vi.advanceTimersByTime(1))
 expect(container.querySelector('[data-construction-effect]')).toBeNull()
 click('제분소 (8,8)');expect(screen.getByRole('dialog')).toBeTruthy()
},20000)
it('blocks production, sale, storage, transformation and capacity until completion',()=>{
 const initial=initialTopview(),state={...initial,objects:[...initial.objects,{id:99,kind:'mill' as const,x:8,y:8,constructionReadyAt:60000}]}
 expect(activeBuildings(state,'mill')).toHaveLength(0)
 expect(simulateFarm(state,99,{type:'mill',quantity:1},0).state).toBe(state)
 expect(farmBuildingStorageError(state,99)).toContain('건설')
 expect(resellFarmObject(state,99).state).toBe(state)
 expect(transformFarmObject(state,99,'flip')).toBe(state)
 expect(finishFarmConstruction(state,59999)).toBe(state)
 const done=finishFarmConstruction(state,60000)
 expect(activeBuildings(done,'mill')).toHaveLength(1)
 expect(finishFarmConstruction(done,60001)).toBe(done)
 expect(done.gold).toBe(state.gold)
})
