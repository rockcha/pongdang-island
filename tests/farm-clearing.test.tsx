import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
function setup(){vi.useFakeTimers();const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>);click('꾸미기');click('개간하기');return result}
it('clears multiple selected tiles concurrently in three seconds and charges once per tile',()=>{
 const {container}=setup()
 click('개간 위치 8,13')
 expect(container.querySelector('[data-clearing-cell="8,13"]')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'밭 (8,13)'})).toBeNull()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('15,000')
 click('개간 위치 8,14')
 act(()=>vi.advanceTimersByTime(2999))
 expect(screen.queryByRole('button',{name:'밭 (8,13)'})).toBeNull()
 act(()=>vi.advanceTimersByTime(1))
 expect(screen.getByRole('button',{name:'밭 (8,13)'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'밭 (8,14)'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('14,980')
 expect(container.querySelector('[data-clearing-cell]')).toBeNull()
 click('한 단계 되돌리기')
 expect(screen.queryByRole('button',{name:'밭 (8,13)'})).toBeNull()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('15,000')
})
it('removes a plot without putting it into storage or refunding gold',()=>{
 setup();click('둘러보기');click('밭 (9,13)');click('제거하기')
 expect(screen.queryByRole('button',{name:'밭 (9,13)'})).toBeNull()
 click('보관함')
 expect(screen.queryByRole('button',{name:/밭.*보관/})).toBeNull()
 expect(screen.getByText('회수한 개체가 여기에 보관돼요.')).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('15,000')
})
it('starts a full drag together and reserves the remaining plot capacity for pending jobs',()=>{
 const {container}=setup(),map=container.querySelector('.top-farm-map')!,viewport=container.querySelector('.top-farm-viewport')!
 vi.spyOn(map,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:1120,bottom:960,width:1120,height:960,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,x:number,y:number)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x*40+100,clientY:y*40+100,button:0}),{pointerId:1,pointerType:'mouse'}))
 pointer('pointerdown',7,7);pointer('pointermove',12,7)
 expect(container.querySelectorAll('[data-clearing-preview]')).toHaveLength(6)
 pointer('pointerup',12,7)
 expect(container.querySelectorAll('[data-clearing-cell]')).toHaveLength(4)
 fireEvent.keyDown(screen.getByRole('button',{name:'개간 위치 13,7'}),{key:'Enter'})
 expect(container.querySelectorAll('[data-clearing-cell]')).toHaveLength(4)
 act(()=>vi.advanceTimersByTime(3000))
 for(let x=7;x<=10;x++)expect(screen.getByRole('button',{name:`밭 (${x},7)`})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('14,960')
})
it('rejects paths and cancels pending work when the trial is reset',()=>{
 const {container}=setup()
 click('개간 위치 8,11')
 expect(container.querySelector('[data-clearing-cell]')).toBeNull()
 click('개간 위치 8,13');click('농장 더보기');click('체험 초기화')
 act(()=>vi.advanceTimersByTime(3500))
 expect(screen.queryByRole('button',{name:'밭 (8,13)'})).toBeNull()
 expect(container.querySelector('[data-clearing-cell]')).toBeNull()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('15,000')
})
