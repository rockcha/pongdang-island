import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MemoryRouter,useLocation} from 'react-router'
vi.mock('@/components/header-place-navigation',async original=>{
 const actual=await original<typeof import('@/components/header-place-navigation')>()
 return {...actual,HeaderPlaceNavigation:()=> <nav aria-label="카테고리 메뉴">내 섬 · 바다 · 생활 · 장터 · 광장</nav>}
})
import {PageNavigation,pageNavigation} from '@/components/page-navigation'
afterEach(()=>{cleanup();localStorage.removeItem('pongdang:page-navigation-style');window.history.replaceState(null,'')})
function View(){const location=useLocation();return <><PageNavigation/><output data-testid="location">{location.pathname+location.search}</output></>}
it('identifies root, nested, game and notice pages without breadcrumbs',()=>{
 expect(pageNavigation('/hall-of-fame/').label).toBe('명예의 전당')
 expect(pageNavigation('/arcade/pongi-whack')).toMatchObject({label:'퐁이 잡기',action:{to:'/arcade',label:'목록으로'}})
 expect(pageNavigation('/square/notices/notice','업데이트')).toMatchObject({label:'업데이트',action:{to:'/square/notices'}})
 expect(pageNavigation('/square/notices/new').label).toBe('공지 작성')
 expect(pageNavigation('/shipyard').action).toEqual({to:'/port',label:'항구로'})
 expect(pageNavigation('/warehouse').action).toEqual({to:'/shop',label:'낚시 상점'})
 expect(pageNavigation('/friends/user/aquarium')).toMatchObject({label:'친구 아쿠아리움',fallback:'/friends'})
})
it('hides list and guide actions and falls back safely on direct entry',()=>{
 render(<MemoryRouter initialEntries={['/board/post']}><View/></MemoryRouter>)
 expect(screen.queryByRole('link',{name:'목록으로'})).toBeNull()
 expect(screen.queryByRole('button',{name:/안내$/})).toBeNull()
 expect(screen.queryByRole('img')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'뒤로 가기'}))
 expect(screen.getByTestId('location').textContent).toBe('/board')
})
it('goes back to the actual previous in-app page when history is available',()=>{
 window.history.replaceState({idx:1},'')
 render(<MemoryRouter initialEntries={['/relics','/hall-of-fame']} initialIndex={1}><View/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'뒤로 가기'}))
 expect(screen.getByTestId('location').textContent).toBe('/relics')
})
it('always shows the current page even when an old menu preference remains',()=>{
 localStorage.setItem('pongdang:page-navigation-style','places')
 render(<MemoryRouter initialEntries={['/hall-of-fame']}><View/></MemoryRouter>)
 expect(screen.getByRole('heading',{name:'명예의 전당'})).toBeTruthy()
 expect(screen.queryByRole('navigation',{name:'기존 메뉴'})).toBeNull()
 expect(screen.queryByRole('button',{name:/메뉴로 바꾸기/})).toBeNull()
 expect(screen.getAllByRole('button')[0].getAttribute('aria-label')).toBe('뒤로 가기')
 expect(screen.getByRole('navigation',{name:'카테고리 메뉴'})).toBeTruthy()
})
it('returns a tank detail to the overview even with unrelated history',()=>{
 window.history.replaceState({idx:1},'')
 render(<MemoryRouter initialEntries={['/relics','/aquarium/tank-one']} initialIndex={1}><View/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'뒤로 가기'}))
 expect(screen.getByTestId('location').textContent).toBe('/aquarium')
})
it('returns from a friend tank to its aquarium overview',()=>{
 render(<MemoryRouter initialEntries={['/friends/friend/aquarium?tank=one']}><View/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'뒤로 가기'}))
 expect(screen.getByTestId('location').textContent).toBe('/friends/friend/aquarium')
})
