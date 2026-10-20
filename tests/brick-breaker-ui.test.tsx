import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import BrickBreakerGame from '@/features/arcade/brick-breaker-game'
import type {BrickScore} from '@/features/arcade/brick-breaker-model'

const engine=vi.hoisted(()=>({start:vi.fn(),launch:vi.fn(),next:vi.fn(),bank:vi.fn(),pause:vi.fn(),destroy:vi.fn(),ready:()=>{},error:()=>{},score:(_value:BrickScore)=>{}}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null}))
vi.mock('@/features/arcade/brick-breaker-scene',()=>({createBrickGame:(_parent:HTMLElement,onScore:(score:BrickScore)=>void,_pause:()=>void,ready:()=>void,error:()=>void)=>{engine.ready=ready;engine.error=error;engine.score=onScore;return engine}}))
beforeEach(()=>vi.clearAllMocks())
afterEach(cleanup)
const show=()=>render(<MemoryRouter><BrickBreakerGame/></MemoryRouter>)

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
