import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {existsSync} from 'node:fs'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {topviewItems,initialTopview,placementValid,objectFootprint,canFlipFarmObject,canRotateFarmObject,type FarmTool} from '@/features/farm/topview-model'
import {farmDecorationArt} from '@/features/farm/decoration-art'
import {buyFarmItem} from '@/features/farm/farm-stock'

const kinds=['pongiMailbox','teacupCat','bearPicnic','chickSandbox','strawScarecrow','hayBales','toolRack'] as const
afterEach(()=>{cleanup();vi.useRealTimers()})
it('registers all seven usable land decorations with real artwork and a two-cell picnic footprint',()=>{
 const state=initialTopview()
 for(const kind of kinds){
  const item=topviewItems[kind],bought=buyFarmItem(state,kind,2)
  expect(item.terrain).toBe('land');expect(existsSync('public'+farmDecorationArt[kind].path)).toBe(true)
  expect(bought.gold).toBe(state.gold-item.price*2);expect(bought.stored.filter(k=>k===kind)).toHaveLength(2)
  expect(placementValid(state,kind,4,4)).toBe(true);expect(placementValid(state,kind,0,0)).toBe(false)
  expect(canFlipFarmObject(kind)).toBe(true);expect(canRotateFarmObject(kind)).toBe(false)
 }
 expect(objectFootprint({kind:'bearPicnic'})).toEqual({w:2,h:1})
 expect(placementValid(state,'bearPicnic',5,6)).toBe(false)
})
it('buys the collection, places and mirrors the picnic, and shows all remaining items in storage',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
 click('상점');click('장식')
 for(const kind of kinds){const item=topviewItems[kind];click(`${item.name} 구매 · ${item.price} G`)}
 click('Close');act(()=>vi.advanceTimersByTime(200));click('보관함');click('장식');click('곰돌이 피크닉 보관 1개 배치하기')
 fireEvent.click(container.querySelector('[data-farm-cell="7,7"]')!);click('완료');click('곰돌이 피크닉 (7,7)');click('좌우반전')
 expect(screen.getByRole('button',{name:'곰돌이 피크닉 (7,7)'}).querySelector('[data-art-flipped="true"]')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'다리 90도 회전'})).toBeNull()
 click('보관함');click('장식')
 for(const kind of kinds.filter((kind:FarmTool)=>kind!=='bearPicnic'))expect(screen.getByRole('button',{name:`${topviewItems[kind].name} 보관 1개 배치하기`})).toBeTruthy()
})
