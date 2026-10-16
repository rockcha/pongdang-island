import { cleanup,renderHook } from '@testing-library/react'
import { afterEach,expect,it } from 'vitest'
import { clearFishingTrip,fishingTripKey,readFishingTrip,recordFishingCatch,useFishingTripRoute } from '@/features/fishing/fishing-trip'
import type { FishingAttempt } from '@/features/fishing/api'

const caught={operation_id:'first',region_id:'pongdang',bait_id:'bait',rarity:'rare',created_at:'2026-10-16',species:{id:'fish',name:'달빛 물고기',rarity:'rare',thumbnail_path:'fish.png'}} as FishingAttempt
afterEach(()=>{cleanup();localStorage.clear()})

it('persists real catches, ignores failed casts and deduplicates retried results per account',()=>{
 recordFishingCatch('me',caught)
 recordFishingCatch('me',caught)
 recordFishingCatch('me',{...caught,operation_id:'failed',species:null})
 expect(readFishingTrip('me')).toEqual([caught])
 expect(readFishingTrip('someone-else')).toEqual([])
 recordFishingCatch('me',{...caught,operation_id:'next',region_id:'coral'})
 expect(readFishingTrip('me').map(item=>item.operation_id)).toEqual(['next','first'])
})

it('keeps the trip through regions, sailing and reloads, then clears it on another menu',()=>{
 recordFishingCatch('me',caught)
 const {rerender,unmount}=renderHook(({path})=>useFishingTripRoute('me',path),{initialProps:{path:'/region/pongdang'}})
 rerender({path:'/sailing/coral'})
 rerender({path:'/region/coral'})
 expect(readFishingTrip('me')).toHaveLength(1)
 unmount()
 renderHook(()=>useFishingTripRoute('me','/region/coral'))
 expect(readFishingTrip('me')).toHaveLength(1)
 const next=renderHook(({path})=>useFishingTripRoute('me',path),{initialProps:{path:'/region/coral'}})
 next.rerender({path:'/aquarium'})
 expect(readFishingTrip('me')).toEqual([])
})

it('recovers from malformed storage and clears only the selected account',()=>{
 localStorage.setItem(fishingTripKey('me'),'broken json')
 expect(readFishingTrip('me')).toEqual([])
 localStorage.setItem(fishingTripKey('me'),'[null,{},5]')
 expect(readFishingTrip('me')).toEqual([])
 recordFishingCatch('me',caught)
 recordFishingCatch('other',caught)
 clearFishingTrip('me')
 expect(readFishingTrip('me')).toEqual([])
 expect(readFishingTrip('other')).toHaveLength(1)
})
