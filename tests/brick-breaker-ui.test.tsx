import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import BrickBreakerGame from '@/features/arcade/brick-breaker-game'
import type {BrickScore} from '@/features/arcade/brick-breaker-model'

const engine=vi.hoisted(()=>({start:vi.fn(),launch:vi.fn(),next:vi.fn(),bank:vi.fn(),testDrop:vi.fn(),pause:vi.fn(),destroy:vi.fn(),ready:()=>{},error:()=>{},score:(_value:BrickScore)=>{}}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null}))
vi.mock('@/features/arcade/brick-breaker-scene',()=>({createBrickGame:(_parent:HTMLElement,onScore:(score:BrickScore)=>void,_pause:()=>void,ready:()=>void,error:()=>void)=>{engine.ready=ready;engine.error=error;engine.score=onScore;return engine}}))
beforeEach(()=>vi.clearAllMocks())
afterEach(cleanup)
const show=()=>render(<MemoryRouter><BrickBreakerGame/></MemoryRouter>)
it('opens a test list beside practice and spawns drops without restarting an active run',async()=>{
 show();await act(async()=>{});act(()=>engine.ready())
 fireEvent.click(screen.getByRole('button',{name:'아이템·방해물 테스트'}))
 fireEvent.click(screen.getByRole('button',{name:/어뢰 아이템/}))
 expect(engine.start).toHaveBeenCalledOnce()
 expect(engine.testDrop).toHaveBeenLastCalledWith('item')
 fireEvent.click(screen.getByRole('button',{name:/돌진 상어/}))
 expect(engine.testDrop).toHaveBeenLastCalledWith('shark')
 expect(engine.start).toHaveBeenCalledOnce()
 for(const [name,kind] of [['긴 널판지','wide'],['물방울 보호막','shield'],['진주 분열','split'],['하트 회복','heart'],['집게 자석','magnet'],['파도 탄환','wave'],['성게 트리오','urchin'],['먹물 문어','ink'],['매운 해초','seaweed'],['양갈래 복어','puffer'],['끈끈이 액체','sticky'],['널판지 축소','shrink']]){
  fireEvent.click(screen.getByRole('button',{name:new RegExp(name)}))
  expect(engine.testDrop).toHaveBeenLastCalledWith(kind)
 }
 expect(engine.start).toHaveBeenCalledOnce()
 fireEvent.click(screen.getByRole('button',{name:'아이템·방해물 테스트'}))
 expect(screen.queryByRole('button',{name:/어뢰 아이템/})).toBeNull()
})

it('shows infinite hearts only after entering item and hazard testing',async()=>{
 show();await act(async()=>{});act(()=>engine.ready())
 expect(screen.getByLabelText('남은 목숨 3개')).toBeTruthy()
 act(()=>engine.score({phase:'playing',round:1,lives:3,secured:0,pending:0,remaining:30,testMode:true}))
 expect(screen.getByLabelText('생명력 무한')).toBeTruthy()
 expect(screen.queryByLabelText('남은 목숨 3개')).toBeNull()
})

it('offers an explicit relaunch button while a magnet holds the ball',async()=>{
 show();await act(async()=>{});act(()=>engine.ready())
 fireEvent.click(screen.getByRole('button',{name:'연습 시작'}))
 act(()=>engine.score({phase:'playing',round:1,lives:3,secured:0,pending:0,remaining:30,held:true}))
 fireEvent.click(screen.getByRole('button',{name:'공 다시 발사'}));expect(engine.launch).toHaveBeenCalledOnce()
})

it('uses the shared paid/practice menu while paid mode remains disabled',async()=>{
 show();const practice=screen.getByRole('button',{name:'연습 시작'}) as HTMLButtonElement
 const paid=screen.getByRole('button',{name:'실전 시작 10'}) as HTMLButtonElement
 expect(paid.disabled).toBe(true);expect(practice.disabled).toBe(true)
 await waitFor(()=>expect(engine.ready).toBeTypeOf('function'))
 await act(async()=>{engine.ready()})
 expect(practice.disabled).toBe(false)
 fireEvent.click(paid);expect(engine.start).not.toHaveBeenCalled()
 fireEvent.click(practice);expect(engine.start).toHaveBeenCalledOnce()
 fireEvent.click(screen.getByRole('button',{name:'공 발사'}));expect(engine.launch).toHaveBeenCalledOnce()
})
it('keeps practice disabled when artwork fails and destroys the renderer on exit',async()=>{
 const view=show()
 await act(async()=>{})
 act(()=>engine.error())
 expect(await screen.findByRole('alert')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'연습 시작'})).toBeNull()
 view.unmount();expect(engine.destroy).toHaveBeenCalledOnce()
})
