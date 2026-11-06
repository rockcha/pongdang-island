import {farmMapWidth,farmMapHeight,farmCellCenter} from './helpers/farm-map'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview,topviewItems,objectFootprint,objectAt,placementValid,canFlipFarmObject,canRotateFarmObject,type FarmRotation} from '@/features/farm/topview-model'
import {applyLandStroke} from '@/features/farm/land-tools'

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('removes the tree and rotates complete bridge footprints for bounds, collisions and land expansion',()=>{
 const state=initialTopview();expect('tree' in topviewItems).toBe(false);expect(state.objects.some(o=>(o.kind as string)==='tree')).toBe(false)
 for(const rotation of [0,90,180,270] as FarmRotation[]){
  expect(objectFootprint({kind:'woodBridge3',rotation})).toEqual(rotation%180?{w:3,h:1}:{w:1,h:3})
  expect(placementValid(state,'woodBridge3',23,0,undefined,rotation)).toBe(rotation%180===0)
  expect(placementValid(state,'woodBridge3',0,19,undefined,rotation)).toBe(rotation%180!==0)
 }
 const bridge={id:80,kind:'woodBridge3' as const,x:1,y:3,rotation:90 as const};state.objects.push(bridge)
 for(const x of [1,2,3])expect(objectAt(state,x,3)?.id).toBe(80)
 expect(objectAt(state,1,4)).toBeUndefined();expect(placementValid(state,'duckBoat',2,3)).toBe(false)
 expect(placementValid(state,'woodBridge3',3,4,80)).toBe(false)
 const shore={...state,land:['0,1','1,1','2,1'],landStock:3,objects:[{...bridge,x:0,y:0}]}
 expect(applyLandStroke(shore,'place',[{x:0,y:0},{x:1,y:0},{x:2,y:0}]).changed).toEqual([])
 expect(canFlipFarmObject('cow')).toBe(true);expect(canFlipFarmObject('duckBoat')).toBe(true)
 expect(canFlipFarmObject('plot')).toBe(false);expect(canFlipFarmObject('barn')).toBe(false);expect(canRotateFarmObject('cow')).toBe(false)
})
it('offers rotation and mirroring only for a placed bridge and preserves both through recovery and dragging',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('상점');click('장식');expect(screen.queryByRole('article',{name:'나무'})).toBeNull();click('나무다리 1×3 구매 · 150 G');click('Close');act(()=>vi.advanceTimersByTime(200))
 click('보관함');click('장식');click('나무다리 1×3 보관 1개 배치하기')
 expect(screen.queryByRole('button',{name:'다리 90도 회전'})).toBeNull()
 expect(screen.queryByRole('button',{name:'좌우반전'})).toBeNull()
 fireEvent.click(container.querySelector('[data-farm-cell="20,2"]')!);click('완료')
 click('나무다리 1×3 (20,2)');click('다리 90도 회전');click('좌우반전');expect(document.querySelector('[data-object-actions]')).toBeTruthy()
 let bridge=screen.getByRole('button',{name:'나무다리 1×3 (20,2)'})
 expect(bridge.querySelector('[data-object-art]')?.getAttribute('width')).toBe('120');expect(bridge.querySelector('[data-object-art]')?.getAttribute('height')).toBe('40')
 expect(bridge.querySelector('[data-art-rotation="90"][data-art-flipped="true"]')).toBeTruthy()
 click('회수하기');click('나무다리 1×3 (20,2)');click('보관함');click('장식');click('나무다리 1×3 보관 1개 배치하기')
 expect(screen.queryByRole('button',{name:'좌우반전'})).toBeNull()
 fireEvent.click(container.querySelector('[data-farm-cell="20,3"]')!);click('완료');click('이동하기');click('나무다리 1×3 (20,3)');click('좌우반전')
 bridge=screen.getByRole('button',{name:'나무다리 1×3 (20,3)'})
 expect(bridge.querySelector('[data-art-rotation="90"]')).toBeTruthy();expect(bridge.querySelector('[data-art-flipped]')).toBeNull()
 const map=container.querySelector('.top-farm-map')!,viewport=container.querySelector('.top-farm-viewport')!
 vi.spyOn(map,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:farmMapWidth,height:farmMapHeight,right:farmMapWidth,bottom:farmMapHeight,x:0,y:0,toJSON:()=>({})})
 const pointer=(type:string,target:Element,x:number,y:number)=>fireEvent(target,Object.assign(new MouseEvent(type,{bubbles:true,cancelable:true,clientX:farmCellCenter(x),clientY:farmCellCenter(y),button:0}),{pointerId:1,pointerType:'mouse'}))
 pointer('pointerdown',bridge,21,3);pointer('pointermove',viewport,21,5);pointer('pointerup',viewport,21,5)
 expect(screen.getByRole('button',{name:'나무다리 1×3 (20,5)'}).querySelector('[data-art-rotation="90"]')).toBeTruthy()
})
it('mirrors an animal without rotating its footprint or starting production and retains it in storage',()=>{
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('젖소 (16,9)');expect(screen.queryByRole('button',{name:'다리 90도 회전'})).toBeNull()
 click('좌우반전')
 expect(screen.getByRole('button',{name:'젖소 (16,9)'}).querySelector('[data-art-flipped="true"]')).toBeTruthy()
 expect(container.querySelector('[data-farm-effect="feed"]')).toBeNull()
 click('한 단계 되돌리기');expect(screen.getByRole('button',{name:'젖소 (16,9)'}).querySelector('[data-art-flipped]')).toBeNull()
 click('젖소 (16,9)');click('좌우반전');click('회수하기');click('젖소 (16,9)');click('보관함');click('동물');click('젖소 보관 1개 배치하기')
 expect(screen.queryByRole('button',{name:'좌우반전'})).toBeNull()
 fireEvent.click(container.querySelector('[data-farm-cell="6,8"]')!);click('완료')
 expect(screen.getByRole('button',{name:'젖소 (6,8)'}).querySelector('[data-art-flipped="true"]')).toBeTruthy()
})
