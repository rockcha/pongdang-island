import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter,Route,Routes,useLocation} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FriendExpeditionPage} from '@/features/expeditions/friend-expedition-page'
import {FriendExpeditionVisitButton} from '@/features/expeditions/friend-expedition-visit-button'
const mock=vi.hoisted(()=>({load:vi.fn(),boost:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/expeditions/api',()=>({loadFriendExpedition:mock.load,boostFriendExpedition:mock.boost}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/expeditions/active-expedition-card',()=>({ActiveExpeditionCard:({regionName,children}:{regionName:string;children:React.ReactNode})=><div>{regionName}{children}</div>}))
const trip={id:'trip',region_id:'pongdang',returns_at:'2026-10-19T02:30:00Z'}
const base={serverNow:'2026-10-19T02:00:00Z',owner:{id:'friend',nickname:'바다친구',avatar_path:null},active:trip,boosted:false,regionName:'퐁당섬 앞바다',baits:[]}
beforeEach(()=>{vi.clearAllMocks();mock.load.mockResolvedValue(base)})
afterEach(cleanup)
function Path(){return <output aria-label="현재 경로">{useLocation().pathname}</output>}
function show(){render(<MemoryRouter initialEntries={['/friends/friend/expeditions']}><Routes><Route path="/friends/:ownerId/expeditions" element={<FriendExpeditionPage/>}/></Routes></MemoryRouter>)}
it('visits the friend departure from the list without sending help or opening a guard there',()=>{
 render(<MemoryRouter><FriendExpeditionVisitButton owner="friend" nickname="바다친구" now={Date.parse(base.serverNow)} statusError={false} status={{friend_id:'friend',expedition_id:'trip',returns_at:trip.returns_at,boosted:false}}/><Path/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'바다친구님 파견 가속'}))
 expect(screen.getByLabelText('현재 경로').textContent).toBe('/friends/friend/expeditions')
 expect(mock.boost).not.toHaveBeenCalled();expect(screen.queryByRole('alertdialog')).toBeNull()
})
it('shows the friend trip and confirms help only from its visit page',async()=>{
 show()
 expect(await screen.findByText('퐁당섬 앞바다')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'바다친구님 순풍 보내기'}))
 expect(mock.boost).not.toHaveBeenCalled()
 mock.boost.mockResolvedValue({serverNow:base.serverNow,friends:[{friend_id:'friend',expedition_id:'trip',returns_at:'2026-10-19T02:20:00Z',boosted:true}]})
 mock.load.mockResolvedValue({...base,boosted:true})
 fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.boost).toHaveBeenCalledWith('trip'))
 expect(await screen.findByRole('button',{name:'바다친구님 도움 완료'})).toHaveProperty('disabled',true)
})
it('does not offer assistance for returned unclaimed boats or absent trips',async()=>{
 mock.load.mockResolvedValue({...base,active:null});show()
 expect(await screen.findByText('지금은 파견 중인 어선이 없어요')).toBeTruthy()
 expect(screen.queryByRole('button',{name:/순풍 보내기/})).toBeNull()
})
it('hides the trip if the friendship no longer permits a visit',async()=>{
 mock.load.mockRejectedValue(new Error('FRIENDSHIP_REQUIRED'));show()
 expect((await screen.findByRole('alert')).textContent).toContain('현재 친구인 주민의 파견만 방문할 수 있어요.')
 expect(screen.queryByText('퐁당섬 앞바다')).toBeNull()
})
