import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {transformFarmObject} from '@/features/farm/object-transform'
import {initialTopview,topviewItems,canFlipFarmObject,canRotateFarmObject} from '@/features/farm/topview-model'
import {isFarmFence,farmFenceKinds} from '@/features/farm/fence-kinds'

afterEach(()=>{cleanup();vi.useRealTimers()})
it('keeps every fence fixed while allowing bridges to rotate and other decorations and animals to flip',()=>{
 expect('fenceVertical' in topviewItems).toBe(false)
 for(const [kind,item] of Object.entries(topviewItems)){
  expect(canRotateFarmObject(kind as keyof typeof topviewItems)).toBe(kind.startsWith('woodBridge'))
  if(item.group==='동물'||item.group==='꾸미기'&&kind!=='plot'&&!isFarmFence(kind))expect(canFlipFarmObject(kind as keyof typeof topviewItems)).toBe(true)
 }
 const state=initialTopview();state.objects=[{id:99,kind:'fence',x:7,y:7}]
 for(const kind of farmFenceKinds){const before={...state,objects:[{...state.objects[0],kind}]};expect(canFlipFarmObject(kind)).toBe(false);expect(transformFarmObject(before,99,'rotate')).toBe(before);expect(transformFarmObject(before,99,'flip')).toBe(before)}
 const bridge={...state,objects:[{id:99,kind:'woodBridge3' as const,x:23,y:0}]}
 expect(transformFarmObject(bridge,99,'rotate')).toBe(bridge)
})
it('opens a small object menu on a normal animal click and leaves production untouched',()=>{
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'젖소 (16,9)'}))
 const menu=container.querySelector('[data-object-actions]')!
 expect(menu.tagName.toLowerCase()).toBe('foreignobject')
 expect(screen.queryByRole('button',{name:'다리 90도 회전'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'좌우반전'}))
 expect(screen.getByRole('button',{name:'젖소 (16,9)'}).querySelector('[data-art-flipped]')).toBeTruthy()
 expect(container.querySelector('[data-animal-status="producing"]')).toBeNull()
 fireEvent.click(container.querySelector('[data-farm-cell="0,0"]')!)
 expect(container.querySelector('[data-object-actions]')).toBeNull()
})
it('buys both new fence styles, joins them using their own artwork, and offers no direction menu',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
 click('상점');click('장식');click('흰 울타리 구매 · 60 G');click('짙은 원목 울타리 구매 · 60 G');click('Close');act(()=>vi.advanceTimersByTime(200))
 click('보관함');click('장식');click('흰 울타리 보관 1개 배치하기');fireEvent.click(container.querySelector('[data-farm-cell="7,7"]')!)
 click('짙은 원목 울타리 보관 1개 배치하기');fireEvent.click(container.querySelector('[data-farm-cell="8,7"]')!);click('완료')
 const white=screen.getByRole('button',{name:'흰 울타리 (7,7)'}),dark=screen.getByRole('button',{name:'짙은 원목 울타리 (8,7)'})
 expect(white.querySelector('[data-farm-connected-fence="e"]')).toBeTruthy();expect(dark.querySelector('[data-farm-connected-fence="w"]')).toBeTruthy()
 expect(white.querySelector('image')?.getAttribute('href')).toContain('/v15/decor/fenceWhite.png')
 expect(dark.querySelector('image')?.getAttribute('href')).toContain('/v15/decor/fenceDark.png')
 click('흰 울타리 (7,7)');expect(container.querySelector('[data-object-actions]')).toBeNull()
 click('이동하기');click('짙은 원목 울타리 (8,7)');expect(container.querySelector('[data-object-actions]')).toBeNull()
})
