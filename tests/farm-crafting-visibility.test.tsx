import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {initialTopview,type FarmTool} from '@/features/farm/topview-model'
import {ProcessingWorkshop} from '@/features/farm/processing-workshop'
import {MillWorkshop} from '@/features/farm/mill-workshop'
import {FarmProductionDialog} from '@/features/farm/production-dialog'
import {FarmWarehouse} from '@/features/farm/warehouse'
afterEach(cleanup)

it('distinguishes available recipes and shows exactly which ingredient is short',()=>{
 const simulation=initialTopview().simulation
 Object.assign(simulation.inventory,{chickenMeat:1,carrot:3})
 render(<ProcessingWorkshop buildingId={28} kind="kitchen" simulation={simulation} now={0} onAction={vi.fn()}/>)
 const ready=screen.getByRole('button',{name:'구운 당근 선택'}),missing=screen.getByRole('button',{name:'닭고기수프 선택'})
 expect(ready.dataset.craftStatus).toBe('ready');expect(missing.dataset.craftStatus).toBe('missing')
 fireEvent.click(missing)
 expect(screen.getByLabelText('닭고기 · 보유 1개 / 필요 2개 · 1개 부족')).toBeTruthy()
 expect(screen.getByLabelText('당근 · 보유 3개 / 필요 3개 · 충분')).toBeTruthy()
 expect(screen.getByRole('button',{name:'닭고기수프 만들기'})).toHaveProperty('disabled',true)
})
it('updates required counts with the production quantity and enables a funded recipe',()=>{
 const simulation=initialTopview().simulation,action=vi.fn()
 Object.assign(simulation.inventory,{chickenMeat:4,carrot:6})
 render(<ProcessingWorkshop buildingId={28} kind="kitchen" simulation={simulation} now={0} onAction={action}/>)
 fireEvent.click(screen.getByRole('button',{name:'닭고기수프 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'닭고기수프 제작 수량 늘리기'}))
 expect(screen.getByLabelText('닭고기 · 보유 4개 / 필요 4개 · 충분')).toBeTruthy()
 expect(screen.getByLabelText('당근 · 보유 6개 / 필요 6개 · 충분')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'닭고기수프 만들기'}))
 expect(action).toHaveBeenCalledWith({type:'craft',recipe:'chickenSoup',quantity:2})
})
it('distinguishes a locked mill recipe from insufficient ingredients and keeps a one-batch preview',()=>{
 const simulation=initialTopview().simulation;simulation.inventory.wheat=1
 render(<MillWorkshop buildingId={50} simulation={simulation} now={0} onAction={vi.fn()}/>)
 expect(screen.getByLabelText('밀 · 보유 1개 / 필요 3개 · 2개 부족')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'쌀 선택'}))
 expect(screen.getByText('종자 연구 필요')).toBeTruthy()
 expect(screen.getByRole('spinbutton',{name:'벼 수량'})).toHaveProperty('value','1')
 expect(screen.getByRole('button',{name:'벼 도정 시작'})).toHaveProperty('disabled',true)
})
it.each(['kitchen','mill','textileMill','sewingWorkshop','waterwheel'] as FarmTool[])('shows the %s upgrade action without opening a disclosure',kind=>{
 const state=initialTopview(),object={id:100,kind,x:4,y:4},onAction=vi.fn();state.objects.push(object)
 render(<FarmProductionDialog object={object} state={state} message="" onAction={onAction} onClose={vi.fn()}/>)
 const region=screen.getByRole('region',{name:'건물 업그레이드'})
 const upgrade=within(region).getByRole('button',{name:'업그레이드 · 3,000 G'})
 expect(upgrade.closest('details')).toBeNull();fireEvent.click(upgrade)
 expect(onAction).toHaveBeenCalledWith({type:'upgrade'})
})
it('shows warehouse expansion immediately with the correct next capacity',()=>{
 const state=initialTopview(),object=state.objects.find(o=>o.kind==='warehouse')!
 render(<FarmWarehouse simulation={state.simulation} state={state} object={object} onAction={vi.fn()} onClose={vi.fn()}/>)
 expect(screen.getByRole('button',{name:'업그레이드 · 3,000 G'})).toBeTruthy()
 expect(within(screen.getByRole('region',{name:'건물 업그레이드'})).getByText('60개')).toBeTruthy()
})
it('labels removal clearly and shows only one gold icon for the refund',()=>{
 const state=initialTopview(),object=state.objects.find(o=>o.kind==='kitchen')!,onSell=vi.fn()
 render(<FarmProductionDialog object={object} state={state} message="" onAction={vi.fn()} onClose={vi.fn()} onStore={vi.fn()} onSell={onSell}/>)
 const remove=screen.getByRole('button',{name:'작은 주방 건물 제거'})
 expect(remove.textContent).toContain('건물 제거')
 expect(remove.querySelectorAll('.farm-gold-icon')).toHaveLength(1)
 expect(remove.textContent).not.toContain('판매')
 fireEvent.click(remove);expect(onSell).toHaveBeenCalledOnce()
})
it('explains why an upgrade is unavailable and preserves the running upgrade cancellation',()=>{
 const state=initialTopview(),object=state.objects.find(o=>o.kind==='kitchen')!,onAction=vi.fn()
 state.simulation.processingJobs[object.id]={recipe:'chickenSoup',quantity:1,startedAt:0,readyAt:10000}
 const {rerender}=render(<FarmProductionDialog object={object} state={state} message="" onAction={onAction} onClose={vi.fn()}/>)
 expect(screen.getByRole('button',{name:'업그레이드 · 3,000 G'})).toHaveProperty('disabled',true)
 expect(screen.getByText('생산물을 수령한 뒤 확장할 수 있어요.')).toBeTruthy()
 state.simulation.processingJobs={};state.simulation.upgradeJobs[object.id]={startedAt:0,readyAt:300000,fromLevel:1}
 rerender(<FarmProductionDialog object={object} state={state} message="" onAction={onAction} onClose={vi.fn()}/>)
 expect(screen.getByRole('progressbar',{name:'건물 업그레이드 진행'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'업그레이드 취소'}))
 expect(onAction).toHaveBeenCalledWith({type:'cancelUpgrade'})
})
