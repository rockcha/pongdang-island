import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview,topviewItems,placementValid,objectAt,canPlaceLand,farmPlacementTerrain} from '@/features/farm/topview-model'
import {applyLandStroke,buyLandStock} from '@/features/farm/land-tools'

afterEach(()=>{cleanup();vi.useRealTimers()})
const sea=['pongiTube','pongiTubeRed','duckBoat','woodBridge1','woodBridge2','woodBridge3','sealFloat','waterLilies'] as const
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('classifies all existing decorations as land and the new decorations as water-only',()=>{
 const state=initialTopview()
 for(const kind of ['flowers','bench','fence','rabbitTopiary','mushroomLamp'] as const){expect(farmPlacementTerrain(kind)).toBe('land');expect(placementValid(state,kind,0,0)).toBe(false)}
 for(const kind of sea){expect(farmPlacementTerrain(kind)).toBe('sea');expect(placementValid(state,kind,0,0)).toBe(true);expect(placementValid(state,kind,7,7)).toBe(false)}
 for(const [kind,h] of [['woodBridge1',1],['woodBridge2',2],['woodBridge3',3]] as const){expect(topviewItems[kind]).toMatchObject({w:1,h});expect(placementValid(state,kind,0,20-h)).toBe(true);expect(placementValid(state,kind,0,21-h)).toBe(false)}
 expect(placementValid(state,'woodBridge3',5,2)).toBe(false)
 for(const [x,y] of [[-1,0],[0,-1],[24,0],[NaN,0],[0,.5]])expect(placementValid(state,'duckBoat',x,y)).toBe(false)
})
it('checks the full bridge footprint for overlaps while allowing movement across its own footprint',()=>{
 const state=initialTopview();state.objects.push({id:80,kind:'woodBridge3',x:3,y:5})
 for(const y of [5,6,7]){expect(objectAt(state,3,y)?.id).toBe(80);expect(placementValid(state,'duckBoat',3,y)).toBe(false)}
 expect(placementValid(state,'woodBridge3',3,6)).toBe(false)
 expect(placementValid(state,'woodBridge3',3,6,80)).toBe(true)
 expect(placementValid(state,'woodBridge3',4,5,80)).toBe(false)
})
it('cannot expand land under any part of a water decoration or consume land stock for those cells',()=>{
 const state=buyLandStock(initialTopview(),4);state.objects.push({id:80,kind:'woodBridge3',x:3,y:5})
 const result=applyLandStroke(state,'place',[{x:3,y:5},{x:3,y:6},{x:3,y:7},{x:3,y:8}])
 expect(result.changed).toEqual([{x:3,y:8}]);expect(result.state.landStock).toBe(3)
 expect(result.blocked).toEqual([5,6,7].map(y=>({cell:{x:3,y},reason:'occupied'})))
 expect(canPlaceLand(state,3,6)).toBe(false)
})
it('separates shop and storage categories and places, moves and recovers a water bridge',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('상점');click('장식')
 const shop=screen.getByRole('dialog',{name:'상점'})
 expect(within(shop).getByRole('article',{name:'꽃밭'})).toBeTruthy()
 expect(within(shop).getByRole('article',{name:'민트 튜브 탄 퐁이'})).toBeTruthy()
 expect(within(shop).queryByRole('button',{name:'바다용'})).toBeNull()
 expect(within(shop).queryByRole('button',{name:'육지용'})).toBeNull()
 expect(within(shop).getByRole('article',{name:'꽃밭'}).querySelector('.farm-item-art>[data-terrain="land"]')).toBeTruthy()
 expect(within(shop).getByRole('article',{name:'민트 튜브 탄 퐁이'}).querySelector('.farm-item-art>[data-terrain="sea"]')).toBeTruthy()
 for(const kind of sea)expect(within(shop).getByRole('article',{name:topviewItems[kind].name})).toBeTruthy()
 click('나무다리 1×3 구매 · 150 G');click('Close');act(()=>vi.advanceTimersByTime(200));click('보관함');click('장식')
 click('나무다리 1×3 보관 1개 배치하기')
 expect(screen.getByText(/빈 바다를 눌러 배치/)).toBeTruthy()
 fireEvent.click(container.querySelector('[data-farm-cell="7,7"]')!)
 expect(screen.getAllByRole('status').some(status=>status.textContent?.includes('바다 위'))).toBe(true)
 expect(screen.getByRole('button',{name:'나무다리 1×3 보관 1개 배치하기'})).toBeTruthy()
 const target=screen.getByRole('button',{name:'배치 위치 3,5'})
 fireEvent.keyDown(target,{key:'Enter'});click('완료')
 expect(screen.getByRole('button',{name:'나무다리 1×3 (3,5)'})).toBeTruthy()
 expect(container.querySelector('.top-farm-gold')?.textContent).toContain('14,850')
 click('이동하기');click('나무다리 1×3 (3,5)');fireEvent.keyDown(screen.getByRole('button',{name:'배치 위치 2,5'}),{key:'Enter'})
 expect(screen.getByRole('button',{name:'나무다리 1×3 (2,5)'})).toBeTruthy()
 click('완료');click('회수하기');click('나무다리 1×3 (2,5)')
 expect(screen.queryByRole('button',{name:'나무다리 1×3 (2,5)'})).toBeNull()
 click('보관함');click('장식');expect(screen.getByRole('button',{name:'나무다리 1×3 보관 1개 배치하기'})).toBeTruthy()
})
