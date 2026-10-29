import {fireEvent,render,screen,cleanup} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {MemoryRouter} from 'react-router'
import {IslandPlacesDialog} from '@/features/my-island/island-places-dialog'
import {ownedFacilities} from '@/features/my-island/owned-facilities'

afterEach(cleanup)
it('links new destinations even when no building has been placed and filters by category and name',()=>{
 render(<MemoryRouter><IslandPlacesDialog open onOpenChange={()=>{}} facilities={ownedFacilities()}/></MemoryRouter>)
 expect(screen.getByRole('link',{name:'벼룩시장'}).getAttribute('href')).toBe('/flea-market')
 expect(screen.getByRole('link',{name:'개체 도감'}).getAttribute('href')).toBe('/collection')
 expect(screen.getByRole('link',{name:'아이템 도감'}).getAttribute('href')).toBe('/item-collection')
 expect(screen.getByRole('link',{name:'만선 승부장'}).getAttribute('href')).toBe('/voyage-bets')
 expect(screen.getByRole('link',{name:'오늘의 낚시 기록'}).getAttribute('href')).toBe('/fishing-records')
 fireEvent.click(screen.getByRole('button',{name:'수집'}))
 expect(screen.queryByRole('link',{name:'벼룩시장'})).toBeNull()
 expect(screen.getByRole('link',{name:'아이템 도감'})).toBeTruthy()
 fireEvent.change(screen.getByRole('textbox',{name:'섬의 장소 검색'}),{target:{value:'아이템'}})
 expect(screen.getAllByRole('link')).toHaveLength(1)
 expect(screen.getByRole('link',{name:'아이템 도감'})).toBeTruthy()
})
