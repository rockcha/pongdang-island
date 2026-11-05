import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
function setup(){
 const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const map=result.container.querySelector('.top-farm-map')!,viewport=result.container.querySelector('.top-farm-viewport')!
 vi.spyOn(map,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:1120,bottom:960,width:1120,height:960,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,x:number,y:number,id=1,touch=false)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x*40+100,clientY:y*40+100,button:0}),{pointerId:id,pointerType:touch?'touch':'mouse'}))
 const owned=(x:number,y:number)=>result.container.querySelector(`[data-farm-cell="${x},${y}"]`)?.getAttribute('data-farm-owned')==='true'
 return {...result,pointer,owned}
}
function buyFive(){click('이동하기');click('땅 0칸 보유');click('땅 구매하기');click('5칸 구매 · 250 G');click('땅 놓기')}
it('offers three land actions and hides placement targets and previews when no land is in stock',()=>{
 const {container,pointer,owned}=setup()
 click('땅 0칸 보유')
 expect(screen.getByRole('button',{name:'땅 회수하기'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'땅 구매하기'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'흙길 놓기'})).toBeNull()
 click('땅 놓기')
 expect(screen.queryByRole('button',{name:/^땅 \d+,\d+ 놓기$/})).toBeNull()
 pointer('pointerdown',3,4);pointer('pointermove',2,4)
 expect(container.querySelector('[data-land-preview]')).toBeNull()
 pointer('pointerup',2,4);expect(owned(3,4)).toBe(false)
 click('땅 구매하기');click('1칸');click('1칸 구매 · 50 G')
 expect(screen.getByRole('button',{name:'땅 3,4 놓기'})).toBeTruthy()
 pointer('pointerdown',3,4);pointer('pointerup',3,4)
 expect(owned(3,4)).toBe(true)
 expect(screen.queryByRole('button',{name:/^땅 \d+,\d+ 놓기$/})).toBeNull()
 click('완료')
 expect(screen.queryByRole('region',{name:'땅 도구'})).toBeNull()
 expect(screen.getByRole('button',{name:'땅 0칸 보유'}).getAttribute('aria-expanded')).toBe('false')
 expect(container.querySelector('.top-farm-viewport')?.getAttribute('data-land-tool')).toBe('false')
})

it('previews an entire drag and commits it once on release, with one undo and no gold refund',()=>{
 const {container,pointer,owned}=setup();buyFive()
 pointer('pointerdown',3,4);pointer('pointermove',1,4)
 expect(container.querySelectorAll('[data-land-preview="place"]')).toHaveLength(3)
 expect(owned(3,4)).toBe(false)
 pointer('pointerup',1,4)
 expect(owned(3,4)).toBe(true);expect(owned(2,4)).toBe(true);expect(owned(1,4)).toBe(true)
 expect(screen.getByRole('button',{name:'땅 2칸 보유'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('14,750')
 click('한 단계 되돌리기')
 expect(owned(3,4)).toBe(false);expect(owned(2,4)).toBe(false);expect(owned(1,4)).toBe(false)
 expect(screen.getByRole('button',{name:'땅 5칸 보유'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('14,750')
 expect(screen.getByRole('button',{name:'땅 놓기'}).getAttribute('aria-pressed')).toBe('true')
})
it('recovers a stroke and restores all recovered cells with a single undo',()=>{
 const {pointer,owned}=setup();click('이동하기');click('땅 0칸 보유');click('땅 회수하기')
 pointer('pointerdown',6,7);pointer('pointermove',6,10);pointer('pointerup',6,10)
 expect(screen.getByRole('button',{name:'땅 4칸 보유'})).toBeTruthy()
 for(let y=7;y<=10;y++)expect(owned(6,y)).toBe(false)
 click('한 단계 되돌리기')
 for(let y=7;y<=10;y++)expect(owned(6,y)).toBe(true)
 expect(screen.getByRole('button',{name:'땅 0칸 보유'})).toBeTruthy()
})
it('cancels a draft on Escape, pointer cancellation, or a second finger without consuming inventory',()=>{
 const {container,pointer,owned}=setup();buyFive()
 pointer('pointerdown',3,4);pointer('pointermove',2,4);fireEvent.keyDown(container.querySelector('.top-farm')!,{key:'Escape'});pointer('pointerup',2,4)
 expect(owned(3,4)).toBe(false)
 pointer('pointerdown',3,4);pointer('pointercancel',3,4)
 expect(owned(3,4)).toBe(false)
 pointer('pointerdown',3,4,1,true);pointer('pointerdown',3,5,2,true);pointer('pointermove',2,4,1,true);pointer('pointerup',2,4,1,true);pointer('pointerup',3,5,2,true)
 expect(container.querySelector('[data-land-preview]')).toBeNull()
 expect(owned(3,4)).toBe(false)
 expect(screen.getByRole('button',{name:'땅 5칸 보유'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'한 단계 되돌리기'})).toHaveProperty('disabled',true)
})
it('does not allow undo to cross a land purchase and refunds no gold when land is recovered',()=>{
 const {pointer}=setup();buyFive();pointer('pointerdown',3,4);pointer('pointerup',3,4)
 click('땅 구매하기');click('1칸');click('1칸 구매 · 50 G')
 expect(screen.getByRole('button',{name:'한 단계 되돌리기'})).toHaveProperty('disabled',true)
 click('땅 회수하기');pointer('pointerdown',3,4);pointer('pointerup',3,4)
 expect(screen.getByRole('button',{name:'땅 6칸 보유'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('14,700')
})
it('preserves research completion that occurs during a land gesture',()=>{
 vi.useFakeTimers()
 const {pointer}=setup()
 click('종자 연구소 (12,8)');click('감자 연구 · 30 G');expect(screen.queryByRole('dialog')).toBeNull();act(()=>vi.advanceTimersByTime(200))
 buyFive();pointer('pointerdown',3,4);act(()=>vi.advanceTimersByTime(3000));pointer('pointerup',3,4)
 click('완료');click('종자 상점 (8,5)')
 click('감자 선택')
 expect(screen.getByRole('button',{name:'감자 종자 구매'})).toBeTruthy()
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('14,720')
})
