import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {PetCollectionDialog} from '@/features/pets/pet-collection-dialog'
import {petSpecies} from '@/features/pets/pet-catalog'

afterEach(cleanup)
it('counts owned species once and lets players search unowned pets and inspect their jobs',()=>{
 render(<PetCollectionDialog open onOpenChange={vi.fn()} pets={[{speciesId:'sand-golem'},{speciesId:'sand-golem'}]}/> )
 expect(screen.getByRole('progressbar',{name:'보유한 펫 종류'}).getAttribute('value')).toBe('1')
 expect(screen.getAllByRole('button',{name:/상세 보기/})).toHaveLength(petSpecies.length)
 fireEvent.change(screen.getByRole('textbox',{name:'펫도감 검색'}),{target:{value:'파도냥'}})
 expect(screen.getAllByRole('button',{name:/상세 보기/})).toHaveLength(1)
 fireEvent.click(screen.getByRole('button',{name:'파도냥 상세 보기'}))
 expect(screen.getByText('미보유')).toBeTruthy()
 expect(screen.getByText('항구 분실물 분류')).toBeTruthy()
 expect(screen.getByText('45분')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'전체 친구'}))
 fireEvent.change(screen.getByRole('textbox',{name:'펫도감 검색'}),{target:{value:'없는친구'}})
 expect(screen.getByText('검색한 친구를 찾지 못했어요.')).toBeTruthy()
})
