import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {ProfilePage} from '@/features/profile/profile-page'
const auth=vi.hoisted(()=>({email:'other@example.com'}))
const mapTesting=vi.hoisted(()=>({
 loadRegionMap:vi.fn(),setMapPieceTestCount:vi.fn()
}))
vi.mock('@/features/regions/api',()=>mapTesting)
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'player',email:auth.email}}}),getNickname:()=> '퐁이'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:{avatar_path:null},requests:[{status:'accepted'},{status:'pending'}],loading:false,error:null,refresh:vi.fn()})}))
vi.mock('@/features/collection/api',()=>({loadCollection:async()=>({items:[{},{}],catalog:[{discovered:true},{discovered:false}]})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <span>아바타</span>}))
vi.mock('@/features/profile/avatar-api',()=>({prepareAvatar:vi.fn(),saveAvatar:vi.fn()}))
afterEach(()=>{cleanup();auth.email='other@example.com';vi.clearAllMocks()})
it('opens the image picker from the avatar and links the pencil to name editing',async()=>{
 render(<MemoryRouter><ProfilePage/></MemoryRouter>)
 expect(screen.queryByRole('button',{name:'프로필 편집'})).toBeNull()
 expect(screen.queryByText('마이페이지')).toBeNull()
 expect(screen.queryByRole('button',{name:'변경 사항 저장'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'이름 바꾸기'}))
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(screen.getByRole('button',{name:'이 이름으로 시작하기'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 const picker=screen.getByLabelText('아바타 이미지 선택');const click=vi.spyOn(picker,'click')
 fireEvent.click(screen.getByRole('button',{name:'아바타 편집'}))
 expect(click).toHaveBeenCalledOnce()
 await waitFor(()=>expect(screen.getByRole('link',{name:/보유 개체/}).textContent).toContain('2'))
})
it('shows actual discovery and accepted friend counts with destination links',async()=>{
 render(<MemoryRouter><ProfilePage/></MemoryRouter>)
 await waitFor(()=>expect(screen.getByRole('link',{name:/발견한 개체/}).textContent).toContain('1'))
 expect(screen.getByRole('link',{name:/친구/}).textContent).toContain('1')
 expect(screen.queryByRole('link',{name:'설정'})).toBeNull()
 expect(screen.queryByRole('region',{name:'지도 조각 테스트'})).toBeNull()
})

it('lets the test account set its map piece count below logout and shows the returned unlock state',async()=>{
 auth.email='1@1.com'
 const region={id:'nyamnyam',name:'냠냠 한상바다',mapPieceCount:4,mapPieces:[1],unlocked:false}
 mapTesting.loadRegionMap.mockResolvedValue({regions:[region]})
 mapTesting.setMapPieceTestCount.mockResolvedValue({regions:[{...region,mapPieces:[1,2,3,4],unlocked:true}]})
 render(<MemoryRouter><ProfilePage/></MemoryRouter>)
 const input=await screen.findByRole('spinbutton')
 expect((input as HTMLInputElement).value).toBe('1')
 fireEvent.change(input,{target:{value:'4'}})
 fireEvent.click(screen.getByRole('button',{name:'적용'}))
 await waitFor(()=>expect(screen.getByText('냠냠 한상바다 · 4/4개 · 해금')).toBeTruthy())
 expect(mapTesting.setMapPieceTestCount).toHaveBeenCalledWith('nyamnyam',4)
 expect(screen.getByRole('link',{name:'지도에서 확인하기'}).getAttribute('href')).toBe('/harbor')
 fireEvent.change(input,{target:{value:'5'}})
 expect(screen.getByRole('button',{name:'적용'})).toHaveProperty('disabled',true)
})
