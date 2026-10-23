import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {islandRumors,islandRumorAt} from '@/features/fishing/island-rumors'
import {TensionFishingGame} from '@/features/fishing/tension-fishing-game'
import {MemoryRouter} from 'react-router'
import {FishingTools} from '@/features/fishing/fishing-tools'
import type {RegionMap} from '@/features/regions/api'

vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})

it('opens tips only from the icon at the end of the tools column and collapses them with the tools',()=>{
 localStorage.removeItem('pongdang:fishing-tools-collapsed')
 const map={currentRegion:'pongdang',regions:[{id:'pongdang',name:'퐁당섬',unlocked:true}]} as RegionMap
 render(<MemoryRouter><FishingTools map={map}><TensionFishingGame active={false} onCaught={vi.fn()} onCancel={vi.fn()}/></FishingTools></MemoryRouter>)
 const toggle=screen.getByRole('button',{name:'알고 계신가요? 이야기 펼치기'})
 expect(screen.queryByRole('complementary',{name:'알고 계신가요?'})).toBeNull()
 fireEvent.click(toggle)
 expect(screen.getByRole('complementary',{name:'알고 계신가요?'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'이야기 닫기'}))
 expect(screen.queryByRole('complementary')).toBeNull()
 expect(document.activeElement).toBe(toggle)
 fireEvent.click(toggle)
 fireEvent.click(screen.getByRole('button',{name:'낚시 도구 접기'}))
 expect(screen.queryByRole('complementary')).toBeNull()
 expect(screen.queryByRole('button',{name:/알고 계신가요/})).toBeNull()
 localStorage.removeItem('pongdang:fishing-tools-collapsed')
})

it('offers 100 distinct rumors and visits all of them before repeating',()=>{
 expect(islandRumors).toHaveLength(100)
 expect(new Set(islandRumors).size).toBe(100)
 const cycle=Array.from({length:100},(_,page)=>islandRumorAt(12345,page).id)
 expect(new Set(cycle).size).toBe(100)
 expect(islandRumorAt(12345,100)).toEqual(islandRumorAt(12345,0))
})

it('rotates rumors during the wait, freezes while paused, and removes them at the bite',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
 const props={castId:'rumor-cast',challenge:{wait:30,confirmBite:false},onCaught:vi.fn(),onCancel:vi.fn()}
 const {rerender}=render(<TensionFishingGame {...props}/>)
 const card=()=>screen.queryByRole('complementary',{name:'알고 계신가요?'})
 expect(card()?.textContent).toContain(islandRumorAt(0,0).text)
 await act(async()=>{vi.advanceTimersByTime(12500)})
 expect(card()?.textContent).toContain(islandRumorAt(0,1).text)
 rerender(<TensionFishingGame {...props} paused/>)
 expect(card()).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(30000)})
 rerender(<TensionFishingGame {...props}/>)
 expect(card()?.textContent).toContain(islandRumorAt(0,1).text)
 await act(async()=>{vi.advanceTimersByTime(18000)})
 expect(card()).toBeNull()
 expect((screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement).disabled).toBe(false)
 expect(props.onCaught).not.toHaveBeenCalled()
})

it('shows the story after results on standby and hides it during reserved failures',()=>{
 const props={onCaught:vi.fn(),onCancel:vi.fn()}
 const {rerender}=render(<TensionFishingGame {...props} active={false}/>)
 expect(screen.getByRole('complementary',{name:'알고 계신가요?'})).toBeTruthy()
 rerender(<TensionFishingGame {...props} challenge={{failureAt:3}}/>)
 expect(screen.queryByRole('complementary',{name:'알고 계신가요?'})).toBeNull()
})

it('minimizes and reopens the story while preserving its state through pauses',async()=>{
 vi.useFakeTimers()
 vi.spyOn(Math,'random').mockReturnValue(0)
 const props={castId:'first-cast',challenge:{wait:30},onCaught:vi.fn(),onCancel:vi.fn()}
 const {rerender}=render(<TensionFishingGame {...props}/>)
 fireEvent.click(screen.getByRole('button',{name:'알고 계신가요? 이야기 최소화'}))
 expect(document.activeElement).toBe(screen.getByRole('button',{name:'알고 계신가요? 이야기 펼치기'}))
 await act(async()=>{vi.advanceTimersByTime(12500)})
 expect(screen.queryByRole('complementary')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'알고 계신가요? 이야기 펼치기'}))
 expect(screen.getByRole('complementary').textContent).toContain(islandRumorAt(0,1).text)
 expect(document.activeElement).toBe(screen.getByRole('button',{name:'알고 계신가요? 이야기 최소화'}))
 fireEvent.click(screen.getByRole('button',{name:'알고 계신가요? 이야기 최소화'}))
 rerender(<TensionFishingGame {...props} paused/>)
 rerender(<TensionFishingGame {...props}/>)
 expect(screen.queryByRole('complementary')).toBeNull()
 rerender(<TensionFishingGame {...props} castId="next-cast"/>)
 expect(screen.queryByRole('complementary')).toBeNull()
 rerender(<TensionFishingGame {...props} castId="ready" active={false}/>)
 expect(screen.queryByRole('complementary')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'알고 계신가요? 이야기 펼치기'}))
 rerender(<TensionFishingGame {...props} castId="third-cast"/>)
 rerender(<TensionFishingGame {...props} castId="ready" active={false}/>)
 expect(screen.getByRole('complementary',{name:'알고 계신가요?'})).toBeTruthy()
})
