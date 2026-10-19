import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter,useLocation} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {HeaderPlaceNavigation} from '@/components/header-place-navigation'
const mock=vi.hoisted(()=>({status:null as 'sailing'|'returned'|null}))
vi.mock('@/features/expeditions/use-expedition-status',()=>({useExpeditionStatus:()=>mock.status}))
beforeEach(()=>{mock.status=null})
function View(){const {pathname}=useLocation();return <><HeaderPlaceNavigation/><output data-testid="path">{pathname}</output></>}
afterEach(cleanup)
it('places expeditions below the map and shows sailing and returned states',async()=>{
 mock.status='sailing'
 const view=render(<MemoryRouter initialEntries={['/expeditions']}><View/></MemoryRouter>)
 const activity=screen.getByRole('button',{name:'활동'})
 expect(activity.getAttribute('aria-description')).toBe('파견 중')
 expect(activity.querySelector('.expedition-status-pulse')).toBeTruthy()
 fireEvent.click(activity)
 const menu=await screen.findByRole('menu')
 expect(within(menu).getAllByRole('menuitem').map(item=>item.getAttribute('href'))).toEqual(['/harbor','/expeditions','/farm','/arcade'])
 expect(within(menu).getByText('파견 중')).toBeTruthy()
 mock.status='returned'
 view.rerender(<MemoryRouter initialEntries={['/expeditions']}><View/></MemoryRouter>)
 expect(within(menu).getByText('귀항 완료')).toBeTruthy()
 expect(activity.querySelector('.expedition-status-pulse')).toBeNull()
})
it('opens my island from the life menu',async()=>{
 render(<MemoryRouter initialEntries={['/aquarium']}><View/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'생활'}))
 const menu=await screen.findByRole('menu')
 fireEvent.click(within(menu).getByRole('menuitem',{name:'내 퐁당섬'}))
 expect(screen.getByTestId('path').textContent).toBe('/')
})
it('shows only four category triggers and separates shop and exchange',async()=>{
 render(<MemoryRouter initialEntries={['/shop']}><View/></MemoryRouter>)
 const nav=screen.getByRole('navigation',{name:'장소 바로가기'})
 expect(within(nav).getAllByRole('button')).toHaveLength(4)
 fireEvent.click(within(nav).getByRole('button',{name:'거래'}))
 const menu=await screen.findByRole('menu')
 const shop=within(menu).getByRole('menuitem',{name:/상점/})
 expect(shop.getAttribute('aria-current')).toBe('page')
 fireEvent.click(within(menu).getByRole('menuitem',{name:'거래소'}))
 expect(screen.getByTestId('path').textContent).toBe('/exchange')
 await waitFor(()=>expect(screen.queryByRole('menu')).toBeNull())
})
it('shows the current nested destination and supports escape to dismiss',async()=>{
 render(<MemoryRouter initialEntries={['/square/suggestions']}><View/></MemoryRouter>)
 expect(within(screen.getByRole('button',{name:'커뮤니티'})).queryByText('광장')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'커뮤니티'}))
 const menu=await screen.findByRole('menu')
 expect(within(menu).getAllByRole('menuitem')).toHaveLength(3)
 expect(within(menu).getByRole('menuitem',{name:/광장/}).getAttribute('aria-current')).toBe('page')
 fireEvent.keyDown(menu,{key:'Escape'})
 await waitFor(()=>expect(screen.queryByRole('menu')).toBeNull())
})
