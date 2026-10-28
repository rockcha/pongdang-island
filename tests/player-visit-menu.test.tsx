import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import {PlayerVisitMenu} from '@/features/profile/player-visit-menu'
const mock=vi.hoisted(()=>({requests:[] as {sender_id:string;recipient_id:string;status:string}[],add:vi.fn(),refresh:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({requests:mock.requests,loading:false,refresh:mock.refresh})}))
vi.mock('@/features/friends/api',()=>({sendPlayerFriendRequest:mock.add}))
beforeEach(()=>{mock.requests=[];vi.clearAllMocks();mock.add.mockResolvedValue(undefined);mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
async function open(){render(<MemoryRouter><PlayerVisitMenu userId="other" nickname="이웃퐁"/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'이웃퐁 방문 메뉴'}));return screen.findByRole('menu')}
it('shows aquarium followed by trap only for accepted friends',async()=>{
 mock.requests=[{sender_id:'other',recipient_id:'me',status:'accepted'}]
 const menu=await open()
 expect(within(menu).getAllByRole('menuitem').map(e=>e.textContent)).toEqual(['아쿠아리움 방문','통발 방문'])
 expect(within(menu).getByRole('menuitem',{name:'통발 방문'}).getAttribute('href')).toBe('/friends/other/expeditions')
})
it('adds a non-friend by user ID and prevents another request while pending',async()=>{
 const menu=await open()
 expect(within(menu).getAllByRole('menuitem').map(e=>e.textContent)).toEqual(['아쿠아리움 방문','친구 추가'])
 fireEvent.click(within(menu).getByRole('menuitem',{name:'친구 추가'}))
 await waitFor(()=>expect(mock.add).toHaveBeenCalledExactlyOnceWith('other'))
 await waitFor(()=>expect(mock.refresh).toHaveBeenCalledOnce())
 fireEvent.click(screen.getByRole('button',{name:'이웃퐁 방문 메뉴'}))
 const pending=await screen.findByRole('menuitem',{name:'요청 중'})
 expect(pending.getAttribute('aria-disabled')).toBe('true')
 expect(mock.add).toHaveBeenCalledOnce()
})
it('shows pending outgoing requests and routes incoming requests to the friends page',async()=>{
 mock.requests=[{sender_id:'me',recipient_id:'other',status:'pending'}]
 let menu=await open()
 expect(within(menu).getByRole('menuitem',{name:'요청 중'}).getAttribute('aria-disabled')).toBe('true')
 cleanup();mock.requests=[{sender_id:'other',recipient_id:'me',status:'pending'}]
 menu=await open()
 expect(within(menu).getByRole('menuitem',{name:'받은 요청 확인'}).getAttribute('href')).toBe('/friends')
 expect(mock.add).not.toHaveBeenCalled()
})
