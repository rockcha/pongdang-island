import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview,objectFootprint,canFlipFarmObject,canFlipFarmArt} from '@/features/farm/topview-model'
import {transformFarmObject} from '@/features/farm/object-transform'

afterEach(cleanup)
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('mirrors building artwork without changing production, orders, level, position or footprint',()=>{
 const state=initialTopview(),mill=state.objects.find(o=>o.kind==='mill')!
 mill.level=3;mill.orderKey=90;state.simulation.millJobs[mill.id]={product:'flour',quantity:1,startedAt:0,readyAt:10000}
 const next=transformFarmObject(state,mill.id,'flip'),flipped=next.objects.find(o=>o.id===mill.id)!
 expect(flipped).toEqual({...mill,flipped:true})
 expect(objectFootprint(flipped)).toEqual(objectFootprint(mill));expect(next.simulation).toBe(state.simulation);expect(next.gold).toBe(state.gold)
 expect(transformFarmObject(next,mill.id,'rotate')).toBe(next)
 expect(canFlipFarmArt('mill')).toBe(true);expect(canFlipFarmObject('mill')).toBe(false)
})
it('places flip between move and storage and preserves a mirrored building through storage and placement',()=>{
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('제분소 (6,13)')
 const actions=screen.getByRole('group',{name:'건물 배치 관리'})
 expect(within(actions).getAllByRole('button').map(button=>button.textContent)).toEqual(['이동하기','좌우반전','보관하기'])
 click('좌우반전')
 expect(screen.getByRole('button',{name:'좌우반전'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.getByRole('dialog').querySelector('.farm-sim-title-art [data-art-flipped]')).toBeTruthy()
 expect(container.querySelector('[aria-label="제분소 (6,13)"] [data-art-flipped]')).toBeTruthy()
 click('보관하기');click('보관함');click('건물');click('제분소 보관 1개 배치하기')
 fireEvent.click(container.querySelector('[data-farm-cell="6,13"]')!);click('완료')
 expect(screen.getByRole('button',{name:'제분소 (6,13)'}).querySelector('[data-art-flipped]')).toBeTruthy()
 expect(container.querySelector('[data-object-actions]')).toBeNull()
 click('제분소 (6,13)');click('좌우반전')
 expect(container.querySelector('[aria-label="제분소 (6,13)"] [data-art-flipped]')).toBeNull()
})
it('supports the same middle action in the warehouse without mirroring other buildings',()=>{
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>);click('창고 (18,6)')
 expect(within(screen.getByRole('group',{name:'건물 배치 관리'})).getAllByRole('button').map(button=>button.textContent)).toEqual(['이동하기','좌우반전','보관하기'])
 click('좌우반전')
 expect(screen.getByRole('dialog').querySelector('.farm-sim-title-art [data-art-flipped]')).toBeTruthy()
 click('Close')
 expect(screen.getByRole('button',{name:'창고 (18,6)'}).querySelector('[data-art-flipped]')).toBeTruthy()
 expect(screen.getByRole('button',{name:'제분소 (6,13)'}).querySelector('[data-art-flipped]')).toBeNull()
})
