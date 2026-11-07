import {act,cleanup,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router'
import {OwnAquariumLikeCount} from '@/features/friends/own-aquarium-like-count'
import {loadAquariumLike} from '@/features/friends/aquarium-likes-api'
import {setQueryAccount,appQueryClient} from '@/lib/account-cache'
import {PageNavigation} from '@/components/page-navigation'
const mock=vi.hoisted(()=>({owner:'owner-a' as string|null,read:vi.fn(),like:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:mock.owner?{user:{id:mock.owner}}:null,recovery:false})}))
vi.mock('@/features/friends/aquarium-likes-api',async original=>({...await original<typeof import('@/features/friends/aquarium-likes-api')>(),readAquariumLike:(owner:string,signal:AbortSignal)=>mock.read(owner,signal),likeAquarium:mock.like,
 loadAquariumLike:async(owner:string)=>{const {readAccountResource}=await import('@/lib/account-cache');return readAccountResource(['aquarium-likes',owner],signal=>mock.read(owner,signal))}}))
vi.mock('@/components/header-place-navigation',async original=>({...await original<typeof import('@/components/header-place-navigation')>(),HeaderPlaceNavigation:()=> <nav>장소 메뉴</nav>}))
beforeEach(()=>{mock.owner='owner-a';setQueryAccount(mock.owner);appQueryClient.clear();mock.read.mockReset();mock.like.mockReset();mock.read.mockResolvedValue({count:7})})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear()})
it('shows the cumulative count without a like button and shares the existing account cache',async()=>{
 render(<OwnAquariumLikeCount/>)
 expect(await screen.findByRole('img',{name:'내 아쿠아리움 누적 좋아요 7개'})).toBeTruthy()
 expect(screen.queryByRole('button')).toBeNull();expect(mock.like).not.toHaveBeenCalled()
 await loadAquariumLike('owner-a');expect(mock.read).toHaveBeenCalledTimes(1)
 expect(mock.read.mock.calls[0][0]).toBe('owner-a');expect(mock.read.mock.calls[0][1]).toBeInstanceOf(AbortSignal)
})
it('shows zero and does not turn a loading failure into zero likes',async()=>{
 mock.read.mockResolvedValue({count:0});const view=render(<OwnAquariumLikeCount/>)
 expect(await screen.findByRole('img',{name:'내 아쿠아리움 누적 좋아요 0개'})).toBeTruthy()
 view.unmount();appQueryClient.clear();mock.read.mockRejectedValue(new Error('offline'));render(<OwnAquariumLikeCount/>)
 expect(await screen.findByRole('img',{name:'좋아요 수를 불러오지 못했어요'})).toHaveProperty('textContent','—')
})
it('never shows a previous account count after switching accounts',async()=>{
 let resolve!:(value:unknown)=>void;mock.read.mockImplementation((owner:string)=>owner==='owner-a'?new Promise(r=>{resolve=r}):Promise.resolve({count:2}))
 const view=render(<OwnAquariumLikeCount/>);await waitFor(()=>expect(mock.read).toHaveBeenCalledTimes(1))
 await act(async()=>{mock.owner='owner-b';setQueryAccount(mock.owner);view.rerender(<OwnAquariumLikeCount/>)})
 expect(await screen.findByRole('img',{name:'내 아쿠아리움 누적 좋아요 2개'})).toBeTruthy()
 await act(async()=>resolve({count:99}));expect(screen.queryByText('99')).toBeNull()
})
it.each(['/aquarium','/aquarium/tank-two'])('places the total beside the page title on %s',async path=>{
 render(<MemoryRouter initialEntries={[path]}><PageNavigation/></MemoryRouter>)
 const count=await screen.findByRole('img',{name:'내 아쿠아리움 누적 좋아요 7개'})
 expect(count.closest('h1')).toBeTruthy();expect(count.closest('button')).toBeNull()
})
it('does not request a total on other pages or without an account',()=>{
 const view=render(<MemoryRouter initialEntries={['/profile']}><PageNavigation/></MemoryRouter>)
 expect(mock.read).not.toHaveBeenCalled();view.unmount();mock.owner=null;render(<OwnAquariumLikeCount/>)
 expect(mock.read).not.toHaveBeenCalled()
})
