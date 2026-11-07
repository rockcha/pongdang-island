import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,farmBuildingStorageError} from '@/features/farm/farm-simulation'
import {farmResearchJobs} from '@/features/farm/research-jobs'
import {applyFarmCommand,validFarmState} from '@/features/farm/account-engine'
import {FarmProductionDialog} from '@/features/farm/production-dialog'
import {farmOverview} from '@/features/farm/farm-overview-model'

afterEach(cleanup)
function setup(){const state=initialTopview();state.objects.push({id:100,kind:'lab',x:7,y:6},{id:101,kind:'lab',x:11,y:6},{id:102,kind:'lab',x:14,y:6});return state}
it('runs one independent research per laboratory, prevents duplicate crop spending and completes independently',()=>{
 const before=setup(),original=JSON.stringify(before)
 let state=simulateFarm(before,100,{type:'research',crop:'corn'},0).state
 state=simulateFarm(state,101,{type:'research',crop:'cotton'},0).state
 state=simulateFarm(state,102,{type:'research',crop:'sugarcane'},0).state
 expect(Object.keys(farmResearchJobs(state.simulation))).toHaveLength(3)
 expect(state.gold).toBe(before.gold-5600)
 expect(simulateFarm(state,101,{type:'research',crop:'tomato'},0).state).toBe(state)
 const extra={...state,objects:[...state.objects,{id:103,kind:'lab' as const,x:7,y:10}]}
 expect(simulateFarm(extra,103,{type:'research',crop:'corn'},0).state).toBe(extra)
 expect(farmBuildingStorageError(state,101)).toContain('연구')
 expect(farmOverview(state,1).tasks.filter(task=>task.id.startsWith('research:'))).toHaveLength(3)
 expect(validFarmState(state)).toBe(true)
 state=applyFarmCommand(state,{type:'tick'},1800000)
 expect(state.simulation.unlockedCrops).toContain('cotton')
 expect(Object.keys(farmResearchJobs(state.simulation))).toHaveLength(2)
 expect(farmResearchJobs(state.simulation)[100].crop).toBe('corn')
 state=applyFarmCommand(state,{type:'tick'},7200000)
 expect(state.simulation.unlockedCrops).toEqual(expect.arrayContaining(['corn','cotton','sugarcane']))
 expect(Object.keys(farmResearchJobs(state.simulation))).toHaveLength(0)
 expect(applyFarmCommand(state,{type:'tick'},7200001)).toBe(state)
 expect(JSON.stringify(before)).toBe(original)
})
it('preserves and finishes an older single research while starting a second laboratory',()=>{
 const before=setup();before.simulation.researchJob={crop:'corn',labId:100,startedAt:0,readyAt:1000}
 const state=simulateFarm(before,101,{type:'research',crop:'cotton'},1).state
 expect(state.simulation.researchJob).toBeNull()
 expect(farmResearchJobs(state.simulation)[100]).toEqual(before.simulation.researchJob)
 expect(Object.keys(farmResearchJobs(state.simulation))).toHaveLength(2)
 const done=applyFarmCommand(state,{type:'tick'},1000)
 expect(done.simulation.unlockedCrops).toContain('corn')
 expect(farmResearchJobs(done.simulation)[101].crop).toBe('cotton')
 expect(farmResearchJobs(done.simulation)[100]).toBeUndefined()
 expect(simulateFarm(done,100,{type:'completeResearch'},1000).state).toBe(done)
})
it('allows an idle laboratory to research another crop while showing a shared crop already in progress',()=>{
 const state=simulateFarm(setup(),100,{type:'research',crop:'corn'},0).state,onAction=vi.fn()
 render(<FarmProductionDialog state={state} object={state.objects.find(o=>o.id===101)!} message="" onAction={onAction} onClose={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:'옥수수 선택'}))
 expect(screen.getByRole('button',{name:'옥수수 연구 · 1,800 G'})).toHaveProperty('disabled',true)
 fireEvent.click(screen.getByRole('button',{name:'목화 선택'}))
 const research=screen.getByRole('button',{name:'목화 연구 · 1,800 G'})
 expect(research).toHaveProperty('disabled',false)
 fireEvent.click(research);expect(onAction).toHaveBeenCalledWith({type:'research',crop:'cotton'})
})
