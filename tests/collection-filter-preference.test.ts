import {afterEach,expect,it,vi} from 'vitest'
import {readCollectionFilters,saveCollectionFilters} from '@/features/collection/filter-preference'

afterEach(()=>{vi.restoreAllMocks();localStorage.clear()})

it('keeps fishing filters separate for each account and leaves unpersisted books at their requested habitat',()=>{
 const filters={tab:'fish',rarity:'rare',habitat:'coral',status:'discovered'} as const
 saveCollectionFilters('one',filters)
 expect(readCollectionFilters('one')).toEqual(filters)
 expect(readCollectionFilters('two')).toEqual({tab:'all',rarity:'all',habitat:'all',status:'all'})
 expect(readCollectionFilters(undefined,'mistmoon')).toEqual({tab:'all',rarity:'all',habitat:'mistmoon',status:'all'})
})

it('falls back safely for corrupt or unsupported stored selections',()=>{
 const key='pongdang:fishing-collection-filters:v1:one'
 localStorage.setItem(key,'{broken')
 expect(readCollectionFilters('one')).toEqual({tab:'all',rarity:'all',habitat:'all',status:'all'})
 localStorage.setItem(key,JSON.stringify({tab:'unsupported',rarity:'rare',habitat:'unknown'}))
 expect(readCollectionFilters('one')).toEqual({tab:'all',rarity:'rare',habitat:'all',status:'all'})
})

it('keeps collection filters usable when browser storage is blocked',()=>{
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked')})
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked')})
 expect(readCollectionFilters('one')).toEqual({tab:'all',rarity:'all',habitat:'all',status:'all'})
 expect(()=>saveCollectionFilters('one',{tab:'all',rarity:'all',habitat:'all',status:'all'})).not.toThrow()
})
it('preserves old filters and defaults missing or invalid ownership state to all',()=>{
 const key='pongdang:fishing-collection-filters:v1:legacy'
 localStorage.setItem(key,JSON.stringify({tab:'fish',rarity:'rare',habitat:'coral'}))
 expect(readCollectionFilters('legacy')).toEqual({tab:'fish',rarity:'rare',habitat:'coral',status:'all'})
 localStorage.setItem(key,JSON.stringify({tab:'fish',status:'unsupported'}))
 expect(readCollectionFilters('legacy').status).toBe('all')
})
