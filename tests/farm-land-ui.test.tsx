import {farmMapWidth,farmMapHeight,farmCellCenter} from './helpers/farm-map'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import * as trialInventory from '@/features/farm/trial-inventory'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
function setup(){
 const result=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const map=result.container.querySelector('.top-farm-map')!,viewport=result.container.querySelector('.top-farm-viewport')!
 vi.spyOn(map,'getBoundingClientRect').mockReturnValue({left:0,top:0,right:farmMapWidth,bottom:farmMapHeight,width:farmMapWidth,height:farmMapHeight,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,x:number,y:number,id=1,touch=false)=>fireEvent(viewport,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:farmCellCenter(x),clientY:farmCellCenter(y),button:0}),{pointerId:id,pointerType:touch?'touch':'mouse'}))
 const owned=(x:number,y:number)=>result.container.querySelector(`[data-farm-cell="${x},${y}"]`)?.getAttribute('data-farm-owned')==='true'
 return {...result,pointer,owned}
}
function buyFive(){click('이동하기');click('땅 0칸 보유');click('땅 구매하기');click('5칸 구매 · 500골드');click('땅 놓기')}
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
 click('땅 구매하기');fireEvent.change(screen.getByRole('textbox',{name:'땅 구매 수량'}),{target:{value:'1'}});click('1칸 구매 · 100골드')
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
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('14,500')
 click('한 단계 되돌리기')
 expect(owned(3,4)).toBe(false);expect(owned(2,4)).toBe(false);expect(owned(1,4)).toBe(false)
 expect(screen.getByRole('button',{name:'땅 5칸 보유'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('14,500')
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
 click('땅 구매하기');fireEvent.change(screen.getByRole('textbox',{name:'땅 구매 수량'}),{target:{value:'1'}});click('1칸 구매 · 100골드')
 expect(screen.getByRole('button',{name:'한 단계 되돌리기'})).toHaveProperty('disabled',true)
 click('땅 회수하기');pointer('pointerdown',3,4);pointer('pointerup',3,4)
 expect(screen.getByRole('button',{name:'땅 6칸 보유'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'테스트 골드 안내'}).textContent).toContain('14,400')
})
it('preserves research completion that occurs during a land gesture',()=>{
 vi.useFakeTimers()
 const state=trialInventory.initialFarmTrial(),now=Date.now()
 state.objects.push({id:100,kind:'lab',x:14,y:6})
 state.simulation.researchJob={crop:'corn',labId:100,startedAt:now,readyAt:now+3000}
 vi.spyOn(trialInventory,'initialFarmTrial').mockImplementation(()=>structuredClone(state))
 const {pointer}=setup()
 buyFive();pointer('pointerdown',3,4);act(()=>vi.advanceTimersByTime(3001));pointer('pointerup',3,4)
 click('완료');click('종자 상점 (9,8)')
 click('옥수수 종자 선택')
 expect(screen.getByRole('button',{name:'옥수수 종자 구매'})).toBeTruthy()
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('14,500')
})
