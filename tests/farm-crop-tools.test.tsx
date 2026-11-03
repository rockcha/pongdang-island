import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,storedFarmGoods,type FarmGood} from '@/features/farm/farm-simulation'
import {FarmWarehouse} from '@/features/farm/warehouse'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('drags seeds across plots once, grows for ten seconds, then harvests concurrently for three seconds into the warehouse',()=>{
 vi.useFakeTimers()
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const map=container.querySelector('.top-farm-map')!,viewport=container.querySelector('.top-farm-viewport')!
 vi.spyOn(map,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:1120,bottom:960,width:1120,height:960,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,x:number,y:number)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x*40+100,clientY:y*40+100,button:0}),{pointerId:1,pointerType:'mouse'}))
 click('심기');click('밀 4개')
 pointer('pointerdown',9,13);pointer('pointermove',11,13);pointer('pointermove',9,13);pointer('pointerup',9,13)
 expect(container.querySelector('.farm-plant-bar')?.textContent).toContain('×1')
 expect(container.querySelector('.farm-seed-tray')).toBeNull()
 expect(screen.getAllByRole('progressbar',{name:/밀 성장/})).toHaveLength(3)
 act(()=>vi.advanceTimersByTime(5000))
 expect(Number(screen.getByRole('progressbar',{name:'밀 성장 (9,13)'}).getAttribute('aria-valuenow'))).toBe(50)
 click('완료');click('밭 (9,13)')
 expect(container.querySelector('[data-harvesting]')).toBeNull()
 click('Close')
 act(()=>vi.advanceTimersByTime(5000))
 expect(screen.getByRole('progressbar',{name:'밀 성장 (9,13)'}).getAttribute('aria-valuenow')).toBe('100')
 expect(screen.queryByRole('button',{name:'수확하기'})).toBeNull()
 click('밭 (9,13)');click('밭 (10,13)');click('밭 (11,13)');click('밭 (9,13)')
 expect(container.querySelectorAll('[data-harvesting]')).toHaveLength(3)
 expect(container.querySelector('[data-harvesting]>rect')).toBeNull()
 act(()=>vi.advanceTimersByTime(2999))
 expect(screen.getAllByRole('progressbar',{name:'수확 진행'})).toHaveLength(3)
 act(()=>vi.advanceTimersByTime(1))
 expect(container.querySelectorAll('[data-harvesting]')).toHaveLength(0)
 expect(screen.queryByRole('progressbar',{name:/밀 성장/})).toBeNull()
 click('창고')
 const warehouse=screen.getByRole('dialog')
 expect(warehouse.querySelectorAll('.farm-warehouse-slot')).toHaveLength(1)
 expect(within(warehouse).getByText('×15')).toBeTruthy()
 expect(within(warehouse).getByText('1 / 10칸')).toBeTruthy()
 click('가공품');expect(within(warehouse).queryByText('밀')).toBeNull()
})
it('harvests a mature plot with a tap while seeds remain selected, without consuming another seed',()=>{
 vi.useFakeTimers()
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('심기');click('밀 4개');click('밭 (9,13)')
 act(()=>vi.advanceTimersByTime(10000))
 click('밭 (9,13)')
 expect(container.querySelectorAll('[data-harvesting]')).toHaveLength(1)
 expect(container.querySelector('.farm-plant-bar')?.textContent).toContain('×3')
 act(()=>vi.advanceTimersByTime(3000))
 expect(screen.queryByRole('progressbar',{name:'밀 성장 (9,13)'})).toBeNull()
 expect(container.querySelector('.farm-plant-bar')?.textContent).toContain('×3')
})
it('keeps incoming new goods at their producer when all ten warehouse slots are occupied, while existing stacks can grow',()=>{
 let state=initialTopview()
 const goods=(Object.keys(state.simulation.inventory) as FarmGood[]).filter(good=>!good.endsWith('Seed')&&good!=='potato')
 for(const good of goods.slice(0,10))state.simulation.inventory[good]=1
 state.simulation.cropJobs[10]={crop:'potato',readyAt:1000}
 expect(storedFarmGoods(state.simulation.inventory)).toHaveLength(10)
 const rejected=simulateFarm(state,10,{type:'harvest'},10000)
 expect(rejected.state).toBe(state);expect(rejected.message).toContain('창고 10칸')
 state.simulation.cropJobs[10]={crop:'wheat',readyAt:1000}
 const accepted=simulateFarm(state,10,{type:'harvest'},10000)
 expect(accepted.state.simulation.inventory.wheat).toBe(2)
 expect(storedFarmGoods(accepted.state.simulation.inventory)).toHaveLength(10)
})
it('separates raw goods and processed goods without counting seeds as warehouse slots',()=>{
 const sim=initialTopview().simulation;sim.inventory.flour=2;sim.inventory.wheatSeed=99
 render(<FarmWarehouse simulation={sim} onClose={()=>{}}/>)
 expect(screen.getByText('2 / 10칸')).toBeTruthy();expect(screen.getByText('×12')).toBeTruthy()
 click('가공품');expect(screen.getByText('밀가루')).toBeTruthy();expect(screen.getByText('×2')).toBeTruthy()
})
