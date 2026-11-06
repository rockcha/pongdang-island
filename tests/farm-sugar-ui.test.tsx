import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {MillWorkshop} from '@/features/farm/mill-workshop'
import {initialFarmSimulation} from '@/features/farm/farm-simulation'

afterEach(cleanup)
it('makes sugar in the mill, shows the two-item yield and requires cane research',()=>{
 const simulation=initialFarmSimulation(),onAction=vi.fn()
 simulation.inventory.sugarcane=3
 const {rerender}=render(<MillWorkshop buildingId={21} simulation={simulation} now={0} onAction={onAction}/>)
 fireEvent.click(screen.getByRole('button',{name:'설탕 선택'}))
 expect(screen.getByRole('button',{name:'설탕 만들기'})).toHaveProperty('disabled',true)
 simulation.unlockedCrops.push('sugarcane')
 rerender(<MillWorkshop buildingId={21} simulation={simulation} now={0} onAction={onAction}/>)
 expect(screen.getByText('사탕수수 2개로 8초 동안 설탕 2개를 만들어요.')).toBeTruthy()
 expect(screen.getByRole('spinbutton',{name:'사탕수수 수량'})).toHaveProperty('max','1')
 fireEvent.click(screen.getByRole('button',{name:'설탕 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'mill',product:'sugar',quantity:1})
 simulation.millJobs[21]={product:'sugar',quantity:1,startedAt:0,readyAt:8000}
 rerender(<MillWorkshop buildingId={21} simulation={simulation} now={8000} onAction={onAction}/>)
 expect(screen.getByRole('heading',{name:'사탕수수 2개 → 설탕 2개'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'수령하기'}))
 expect(onAction).toHaveBeenLastCalledWith({type:'collectFlour'})
})
it('shows only each animal’s regular product while keeping its capacity and production time visible',()=>{
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
 for(const [house,animal,product] of [['가금사 (10,9)','오리','오리알'],['축사 (15,6)','양','양털']]){
  click(house);click(`${animal} 선택`)
  const products=screen.getByRole('region',{name:'생산 가능한 상품'})
  expect(products.textContent).toContain(product)
  expect(products.querySelectorAll('img')).toHaveLength(1)
  expect(screen.getByLabelText(`${animal} 1회 생산 시간 10초`)).toBeTruthy()
  expect(screen.queryByText(/황금|5%/)).toBeNull()
  click('Close')
 }
})
