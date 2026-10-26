import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FundStory} from '@/features/development-fund/fund-story'
beforeEach(()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})))
})
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()})
const advance=(time:number)=>act(()=>{vi.advanceTimersByTime(time)})
it('changes slides at five seconds, repeats, and allows manual selection',()=>{
 render(<FundStory/>);expect(screen.getByRole('heading',{name:'밤낮으로 섬을 지키고 있어요'})).toBeTruthy();expect(screen.getByRole('group',{name:'개발 이야기 1 / 2'})).toBeTruthy()
 advance(4999);expect(screen.queryByRole('group',{name:'후원 이야기 2 / 2'})).toBeNull()
 advance(1);expect(screen.getByRole('group',{name:'후원 이야기 2 / 2'})).toBeTruthy()
 expect(screen.getByRole('heading',{name:'후원을 통해 퐁당섬의 내일을 응원해주세요.'})).toBeTruthy()
 advance(5000);expect(screen.getByRole('group',{name:'개발 이야기 1 / 2'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'후원 이야기 보기'}));expect(screen.getByRole('group',{name:'후원 이야기 2 / 2'})).toBeTruthy()
})
it('pauses during a modal or inactive tab, supports explicit pause and resumes with a full five seconds',()=>{
 const view=render(<FundStory active/>);advance(2000)
 view.rerender(<FundStory active={false}/>);advance(20000);expect(screen.getByRole('group',{name:'개발 이야기 1 / 2'})).toBeTruthy()
 view.rerender(<FundStory active/>);advance(4999);expect(screen.queryByRole('group',{name:'후원 이야기 2 / 2'})).toBeNull()
 advance(1);fireEvent.click(screen.getByRole('button',{name:'슬라이드 자동 전환 일시정지'}));advance(20000)
 expect(screen.getByRole('group',{name:'후원 이야기 2 / 2'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'슬라이드 자동 전환 재생'}));advance(5000)
 expect(screen.getByRole('group',{name:'개발 이야기 1 / 2'})).toBeTruthy()
})
it('keeps reduced motion static and still permits manual navigation',()=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})))
 render(<FundStory/>);advance(20000)
 expect(screen.getByRole('group',{name:'개발 이야기 1 / 2'})).toBeTruthy();expect(screen.queryByRole('button',{name:'슬라이드 자동 전환 일시정지'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'후원 이야기 보기'}));advance(10000);expect(screen.getByRole('group',{name:'후원 이야기 2 / 2'})).toBeTruthy()
})
