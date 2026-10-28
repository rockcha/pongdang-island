import {cleanup,render,screen,fireEvent,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {beforeEach,afterEach,expect,it,vi} from 'vitest'
import {IslandPreviewPage as MyIslandPage} from '@/features/my-island/my-island-page'
import {defaultState} from '@/features/my-island/island-model'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'bulk-preview'}}})}))
const key='pongdang:island:v2:bulk-preview'
beforeEach(()=>{
 localStorage.clear();vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}})
 vi.stubGlobal('PointerEvent',MouseEvent)
 vi.stubGlobal('DOMPoint',class {constructor(public x:number,public y:number){} matrixTransform(){return this}})
})
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals()})
function start(type:string,count:number,name:string){
 localStorage.setItem(key,JSON.stringify({...defaultState(),owned:Array.from({length:count},(_,i)=>`${type}~${i}`),layout:[]}))
 const result=render(<MemoryRouter><MyIslandPage/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:/^보관함/}));fireEvent.click(screen.getByRole('button',{name:'장식',exact:true}))
 const article=screen.getByRole('heading',{name}).closest('article')!
 fireEvent.click(within(article).getByRole('button',{name:'꺼내서 배치'}))
 const map=screen.getByRole('img',{name:'드래그로 이동하고 마우스 휠로 확대·축소하는 섬 지도'})
 Object.defineProperty(map,'getScreenCTM',{value:()=>({inverse:()=>({})})})
 Object.defineProperty(map,'setPointerCapture',{value:()=>{}})
 return {...result,map}
}
const at=(x:number,y:number)=>({button:0,clientX:x*32+1,clientY:y*32+1})
const saved=()=>JSON.parse(localStorage.getItem(key)!)
it('repeatedly stamps owned decorations and exits placement when stock reaches zero',()=>{
 const {map}=start('hydrangea-blue',2,'푸른 수국 화단')
 expect(screen.getByText('보유 2개')).toBeTruthy()
 fireEvent.pointerDown(map,at(8,8));fireEvent.pointerUp(map,at(8,8))
 expect(saved().layout.filter((p:any)=>p.id.startsWith('hydrangea-blue~'))).toHaveLength(1)
 expect(screen.getByText('보유 1개')).toBeTruthy()
 fireEvent.pointerDown(map,at(9,8));fireEvent.pointerUp(map,at(9,8))
 expect(saved().layout.filter((p:any)=>p.id.startsWith('hydrangea-blue~'))).toHaveLength(2)
 expect(screen.queryByRole('dialog')).toBeNull()
 const before=saved();fireEvent.pointerDown(map,at(10,8));fireEvent.pointerUp(map,at(10,8))
 expect(saved()).toEqual(before)
 fireEvent.click(screen.getByRole('button',{name:'되돌리기',exact:true}))
 expect(saved().layout.filter((p:any)=>p.id.startsWith('hydrangea-blue~'))).toHaveLength(1)
 expect(screen.queryByRole('dialog')).toBeNull()
})
it('previews a fence line without saving and undoes the whole line with one action',()=>{
 const {map,container}=start('wood-fence',5,'나무 울타리'),before=saved()
 fireEvent.pointerDown(map,at(8,8));fireEvent.pointerMove(map,at(11,8))
 expect(container.querySelectorAll('[data-decoration-preview]')).toHaveLength(4)
 expect(saved()).toEqual(before)
 fireEvent.pointerUp(map,at(11,8))
 expect(saved().layout.filter((p:any)=>p.id.startsWith('wood-fence~'))).toHaveLength(4)
 expect(screen.getByText('보유 1개')).toBeTruthy()
 fireEvent.click(within(screen.getByRole('dialog',{name:'나무 울타리'})).getByRole('button',{name:'되돌리기',exact:true}))
 expect(saved()).toEqual(before)
 expect(screen.getByText('보유 5개')).toBeTruthy()
 fireEvent.pointerDown(map,at(8,8));fireEvent.pointerMove(map,at(10,8));fireEvent.pointerCancel(map,at(10,8))
 expect(saved()).toEqual(before);expect(container.querySelector('[data-decoration-preview]')).toBeNull()
})
it('stores clicked or swept fences, cancels safely and restores the whole sweep with undo',()=>{
 const ids=Array.from({length:3},(_,i)=>`wood-fence~${i}`),initial={...defaultState(),owned:ids,layout:ids.map((id,i)=>({id,x:8+i,y:8}))}
 localStorage.setItem(key,JSON.stringify(initial))
 const {container}=render(<MemoryRouter><MyIslandPage/></MemoryRouter>)
 const map=screen.getByRole('img',{name:'드래그로 이동하고 마우스 휠로 확대·축소하는 섬 지도'})
 Object.defineProperty(map,'getScreenCTM',{value:()=>({inverse:()=>({})})});Object.defineProperty(map,'setPointerCapture',{value:()=>{}})
 const before=saved(),first=container.querySelector('[data-island-object="wood-fence~0"]')!
 fireEvent.click(screen.getByRole('button',{name:'정리',exact:true}));fireEvent.click(screen.getByRole('button',{name:'장식물 회수',exact:true}))
 expect(screen.getByRole('region',{name:'장식물 제거'})).toBeTruthy()
 fireEvent.pointerDown(first,at(8,8));fireEvent.pointerUp(map,at(8,8))
 expect(saved().layout.some((p:any)=>p.id===ids[0])).toBe(false)
 const afterClick=saved()
 fireEvent.pointerDown(map,at(9,8));fireEvent.pointerMove(map,at(10,8))
 expect(container.querySelectorAll('[data-decoration-removal-preview]')).toHaveLength(2)
 expect(screen.getByText('보관 예정 2개')).toBeTruthy();expect(saved()).toEqual(afterClick)
 fireEvent.pointerCancel(map,at(10,8));expect(saved()).toEqual(afterClick)
 expect(container.querySelector('[data-decoration-removal-preview]')).toBeNull()
 fireEvent.pointerDown(map,at(9,8));fireEvent.pointerMove(map,at(10,8));fireEvent.pointerUp(map,at(10,8))
 expect(saved().layout.filter((p:any)=>ids.includes(p.id))).toHaveLength(0)
 expect(saved().owned).toEqual(before.owned)
 fireEvent.click(screen.getByRole('button',{name:'완료',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'되돌리기',exact:true}));expect(saved()).toEqual(afterClick)
 fireEvent.click(screen.getByRole('button',{name:'되돌리기',exact:true}));expect(saved()).toEqual(before)
})
it('uses two fingers to pan during batch placement without placing an item',()=>{
 class Pointer extends MouseEvent{constructor(type:string,init:PointerEventInit={}){super(type,init);Object.defineProperty(this,'pointerId',{value:init.pointerId??1})}}
 vi.stubGlobal('PointerEvent',Pointer)
 const {map}=start('wood-fence',5,'나무 울타리'),before=saved(),view=map.getAttribute('viewBox')
 fireEvent.pointerDown(map,{...at(8,8),pointerId:1})
 fireEvent.pointerDown(map,{...at(10,8),pointerId:2})
 fireEvent.pointerMove(map,{...at(9,9),pointerId:1})
 fireEvent.pointerMove(map,{...at(11,9),pointerId:2})
 fireEvent.pointerUp(map,{...at(9,9),pointerId:1})
 fireEvent.pointerUp(map,{...at(11,9),pointerId:2})
 expect(saved()).toEqual(before)
 expect(map.getAttribute('viewBox')).not.toBe(view)
 fireEvent.pointerDown(map,{...at(8,8),pointerId:3});fireEvent.pointerUp(map,{...at(8,8),pointerId:3})
 expect(saved().layout.filter((p:any)=>p.id.startsWith('wood-fence~'))).toHaveLength(1)
})
