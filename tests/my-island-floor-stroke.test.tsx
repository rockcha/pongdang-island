import {cleanup,render,screen,fireEvent,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {IslandPreviewPage as MyIslandPage} from '@/features/my-island/my-island-page'
import {defaultState,type IslandState} from '@/features/my-island/island-model'
import {planFloorStroke} from '@/features/my-island/island-land-placement'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'floor-stroke'}}})}))
const key='pongdang:island:v2:floor-stroke'
beforeEach(()=>{
 vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}})
 class Pointer extends MouseEvent{constructor(type:string,init:PointerEventInit={}){super(type,init);Object.defineProperty(this,'pointerId',{value:init.pointerId??1})}}
 vi.stubGlobal('PointerEvent',Pointer)
 vi.stubGlobal('DOMPoint',class {constructor(public x:number,public y:number){} matrixTransform(){return this}})
})
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals()})
const at=(x:number)=>({button:0,clientX:x*32+1,clientY:8*32+1})
const saved=()=>JSON.parse(localStorage.getItem(key)!)
function start(count=5){
 const initial:IslandState={...defaultState(),tileStock:{brick:count},paving:[{x:8,y:8,type:'stone'}]}
 localStorage.setItem(key,JSON.stringify(initial))
 const view=render(<MemoryRouter><MyIslandPage/></MemoryRouter>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'섬 꾸미기 도구'})).getByRole('button',{name:/^보관함/}))
 fireEvent.click(screen.getByRole('button',{name:'타일',exact:true}));const tile=screen.getByRole('heading',{name:'벽돌길'}).closest('article')!
 fireEvent.click(within(tile).getByRole('button',{name:'바닥에 깔기'}))
 const map=screen.getByRole('img',{name:'드래그로 이동하고 마우스 휠로 확대·축소하는 섬 지도'})
 Object.defineProperty(map,'getScreenCTM',{value:()=>({inverse:()=>({})})});Object.defineProperty(map,'setPointerCapture',{value:()=>{}})
 return {...view,map}
}
it('skips sea and unchanged tiles, obeys stock, and returns replaced or removed tile types exactly once',()=>{
 const state:IslandState={...defaultState(),tileStock:{brick:1},paving:[{x:8,y:8,type:'stone'},{x:9,y:8,type:'brick'}]}
 const plan=planFloorStroke(state,[{x:0,y:0},{x:8,y:8},{x:8,y:8},{x:9,y:8},{x:10,y:8}],'brick')
 expect(plan.count).toBe(1);expect(plan.state.tileStock).toMatchObject({brick:0,stone:1})
 const removed=planFloorStroke(plan.state,[{x:8,y:8},{x:8,y:8},{x:9,y:8}],'bare')
 expect(removed.count).toBe(2);expect(removed.state.tileStock).toMatchObject({brick:2,stone:1})
 expect(removed.state.land).toEqual(state.land);expect(removed.state.layout).toEqual(state.layout)
 expect(removed.state.coins).toBe(state.coins)
})
it('previews and cancels tile painting, paints a whole drag, removes by click or drag, and undoes each stroke',()=>{
 const {container,map}=start(),before=saved()
 fireEvent.pointerDown(map,at(8));fireEvent.pointerMove(map,at(11))
 expect(container.querySelectorAll('[data-floor-stroke-preview][data-valid="true"]')).toHaveLength(4)
 expect(saved()).toEqual(before)
 fireEvent.pointerCancel(map,at(11));expect(saved()).toEqual(before)
 fireEvent.pointerDown(map,at(8));fireEvent.pointerMove(map,at(11));fireEvent.pointerUp(map,at(11))
 const painted=saved();expect(painted.tileStock).toMatchObject({brick:1,stone:1});expect(painted.paving).toHaveLength(4)
 fireEvent.click(screen.getByRole('button',{name:'바닥 편집 종료'}))
 fireEvent.click(screen.getByRole('button',{name:'정리',exact:true}));fireEvent.click(screen.getByRole('button',{name:'타일 회수',exact:true}))
 expect(screen.getByRole('region',{name:'타일 제거'})).toBeTruthy()
 fireEvent.pointerDown(map,at(8));fireEvent.pointerUp(map,at(8))
 const clicked=saved();expect(clicked.paving).toHaveLength(3)
 fireEvent.pointerDown(map,at(9));fireEvent.pointerMove(map,at(11));fireEvent.pointerUp(map,at(11))
 expect(saved().paving).toHaveLength(0);expect(saved().tileStock.brick).toBe(5)
 expect(saved().land).toEqual(before.land);expect(saved().layout).toEqual(before.layout)
 fireEvent.click(screen.getByRole('button',{name:'완료',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'되돌리기',exact:true}));expect(saved()).toEqual(clicked)
 fireEvent.click(screen.getByRole('button',{name:'되돌리기',exact:true}));expect(saved()).toEqual(painted)
 fireEvent.click(screen.getByRole('button',{name:'되돌리기',exact:true}));expect(saved()).toEqual(before)
})
it('exits tile placement after a drag exhausts stock and keeps the stroke undoable',()=>{
 const {container,map}=start(2),before=saved()
 fireEvent.pointerDown(map,at(8));fireEvent.pointerMove(map,at(11));fireEvent.pointerUp(map,at(11))
 expect(saved().tileStock.brick).toBe(0)
 expect(saved().paving).toHaveLength(2)
 expect(screen.queryByRole('button',{name:'바닥 편집 종료'})).toBeNull()
 expect(container.querySelector('[data-floor-stroke-preview]')).toBeNull()
 const after=saved()
 fireEvent.pointerDown(map,at(12));fireEvent.pointerUp(map,at(12))
 expect(saved()).toEqual(after)
 fireEvent.click(screen.getByRole('button',{name:'되돌리기',exact:true}))
 expect(saved()).toEqual(before)
})
it('cancels a tile stroke when a second finger starts panning',()=>{
 const {container,map}=start(),before=saved(),view=map.getAttribute('viewBox')
 fireEvent.pointerDown(map,{...at(8),pointerId:1});fireEvent.pointerMove(map,{...at(10),pointerId:1})
 fireEvent.pointerDown(map,{...at(12),pointerId:2});fireEvent.pointerMove(map,{...at(13),pointerId:2})
 fireEvent.pointerUp(map,{...at(10),pointerId:1});fireEvent.pointerUp(map,{...at(13),pointerId:2})
 expect(container.querySelector('[data-floor-stroke-preview]')).toBeNull()
 expect(saved()).toEqual(before);expect(map.getAttribute('viewBox')).not.toBe(view)
})
