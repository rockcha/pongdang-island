import {PlayerLevelsProvider} from '@/features/experience/player-level'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { FriendsPage } from '@/features/friends/friends-page'
import { FriendExpeditionPage } from '@/features/expeditions/friend-expedition-page'
import { BannerBreadcrumb } from '@/components/banner-breadcrumb'

const mock=vi.hoisted(()=>({social:{profile:{friend_code:'ABCDEF123456'},requests:[] as unknown[],loading:true,error:'',refresh:vi.fn()},presence:{friends:[] as {friend_id:string;state:string}[],ready:true,error:false}}))
const levelApi=vi.hoisted(()=>({loadPlayerLevels:vi.fn()}))
const visitApi=vi.hoisted(()=>({load:vi.fn(),boost:vi.fn(),friends:[] as unknown[]}))
vi.mock('@/features/experience/api',()=>levelApi)
vi.mock('@/features/expeditions/use-friend-expeditions',()=>({useFriendExpeditions:()=>({friends:visitApi.friends,now:0,error:false})}))
vi.mock('@/features/expeditions/api',()=>({loadFriendExpedition:visitApi.load,boostFriendExpedition:visitApi.boost}))
vi.mock('@/features/expeditions/active-expedition-card',()=>({ActiveExpeditionCard:()=> <p>친구 통발</p>}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>mock.social}))
vi.mock('@/features/friends/api',()=>({findPlayer:vi.fn(),sendFriendRequest:vi.fn(),loadPlayerDirectory:vi.fn(async()=>({players:[],hasMore:false})),sendPlayerFriendRequest:vi.fn()}))
vi.mock('@/features/friends/use-friend-presence',()=>({useFriendPresence:()=>mock.presence}))
vi.mock('@/features/friends/request-actions',()=>({RequestActions:()=> <button>수락</button>}))
vi.mock('@/features/friends/remove-friend-button',()=>({RemoveFriendButton:()=>null}))
afterEach(()=>{cleanup();mock.social.requests=[];mock.social.loading=true;mock.presence={friends:[],ready:true,error:false};visitApi.friends=[];vi.clearAllMocks()})
it('places the all-users tab after received requests without presence or visit actions',async()=>{
 mock.social.loading=false
 render(<MemoryRouter><FriendsPage/></MemoryRouter>)
 const menu=screen.getByRole('group',{name:'등대 메뉴'})
 expect(within(menu).getAllByRole('button').map(b=>b.getAttribute('aria-label'))).toEqual(['친구 0','받은 요청 0','전체 유저'])
 fireEvent.click(screen.getByRole('button',{name:'전체 유저',exact:true}))
 await screen.findByText('표시할 유저가 없어요.')
 expect(screen.queryByText(/접속 중/)).toBeNull()
 expect(screen.queryByRole('link',{name:/아쿠아리움 방문/})).toBeNull()
 expect(screen.queryByRole('button',{name:'친구 초대'})).toBeNull()
})
it.each(['‹ 친구 목록','등대'])('restores scroll and filters after helping a trap and returning through %s',async(returnLabel)=>{
 mock.social.loading=false
 mock.social.requests=['live','off'].map(id=>({id,sender_id:'me',recipient_id:id,status:'accepted',recipient:{id,nickname:id}}))
 mock.presence.friends=[{friend_id:'live',state:'online'},{friend_id:'off',state:'offline'}]
 levelApi.loadPlayerLevels.mockResolvedValue([])
 const status={friend_id:'live',expedition_id:'trip',returns_at:'2026-10-25T02:30:00Z',boosted:false}
 const result={serverNow:'2026-10-25T02:00:00Z',friends:[{...status,boosted:true}]}
 const visit={serverNow:result.serverNow,owner:{id:'live',nickname:'live',avatar_path:null},active:{id:'trip',returns_at:status.returns_at},boosted:false,baits:[]}
 visitApi.friends=[status];visitApi.load.mockResolvedValue(visit);visitApi.boost.mockResolvedValue(result)
 render(<MemoryRouter initialEntries={[{pathname:'/friends',key:`trap-return-${returnLabel}`}]}><PlayerLevelsProvider><Routes><Route path="/friends" element={<FriendsPage/>}/><Route path="/friends/:ownerId/expeditions" element={<><BannerBreadcrumb to="/friends" parent="등대" title="친구 통발 설치"/><FriendExpeditionPage/></>}/></Routes></PlayerLevelsProvider></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'접속 중만 보기'}))
 const list=screen.getByRole('link',{name:'live의 아쿠아리움 방문'}).closest('section')!.querySelector('.overflow-y-auto')!
 list.scrollTop=480;fireEvent.scroll(list)
 fireEvent.click(screen.getByRole('button',{name:'live님 물고기 유인하기'}))
 fireEvent.click(await screen.findByRole('button',{name:'live님 물고기 유인하기'}))
 visitApi.load.mockResolvedValue({...visit,boosted:true})
 fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await screen.findByRole('button',{name:'live님 도움 완료'})
 expect(visitApi.boost).toHaveBeenCalledWith('trip')
 fireEvent.click(screen.getByRole('link',{name:returnLabel}))
 await screen.findByRole('button',{name:'접속 중만 보기'})
 expect(screen.getByRole('button',{name:'접속 중만 보기'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.queryByText('off')).toBeNull()
 expect(screen.getByRole('link',{name:'live의 아쿠아리움 방문'}).closest('section')!.querySelector('.overflow-y-auto')!.scrollTop).toBe(480)
})
it('restores the friend list scroll and online filter after returning from a visit', async () => {
 mock.social.loading=false
 mock.social.requests=['live','off'].map(id=>({id,sender_id:'me',recipient_id:id,status:'accepted',recipient:{id,nickname:id}}))
 mock.presence.friends=[{friend_id:'live',state:'online'},{friend_id:'off',state:'offline'}]
 levelApi.loadPlayerLevels.mockResolvedValue([])
 function Visit() { const navigate=useNavigate(); return <button onClick={()=>navigate(-1)}>방문에서 복귀</button> }
 render(<MemoryRouter initialEntries={[{pathname:'/friends',key:'scroll-return-test'}]}><PlayerLevelsProvider><Routes><Route path="/friends" element={<FriendsPage/>}/><Route path="/friends/:id/aquarium" element={<Visit/>}/></Routes></PlayerLevelsProvider></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'접속 중만 보기'}))
 const list=screen.getByRole('link',{name:'live의 아쿠아리움 방문'}).closest('section')!.querySelector('.overflow-y-auto')!
 list.scrollTop=480
 fireEvent.scroll(list)
 fireEvent.click(screen.getByRole('link',{name:'live의 아쿠아리움 방문'}))
 fireEvent.click(screen.getByRole('button',{name:'방문에서 복귀'}))
 expect(screen.getByRole('button',{name:'접속 중만 보기'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.queryByText('off')).toBeNull()
 expect(screen.getByRole('link',{name:'live의 아쿠아리움 방문'}).closest('section')!.querySelector('.overflow-y-auto')!.scrollTop).toBe(480)
})
it('replaces loading rows with requests and opens the invite dialog from the footer',()=>{
  const view=render(<MemoryRouter><PlayerLevelsProvider><FriendsPage/></PlayerLevelsProvider></MemoryRouter>)
  expect(screen.getByRole('status',{name:'등대의 소식을 불러오는 중'})).toBeTruthy()
  mock.social.loading=false
  mock.social.requests=[{id:'request',sender_id:'friend',recipient_id:'me',status:'pending',sender:{nickname:'바다친구'}}]
  view.rerender(<MemoryRouter><PlayerLevelsProvider><FriendsPage/></PlayerLevelsProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button',{name:'받은 요청 1'}))
  expect(screen.getByText('바다친구')).toBeTruthy()
  expect(screen.getByRole('button',{name:'수락'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'친구 초대'}))
  expect(screen.getByRole('dialog',{name:'친구와 불빛 이어가기'})).toBeTruthy()
})

it('shows current levels beside accepted friends with a single batch request',async()=>{
 mock.social.loading=false
 mock.social.requests=[{id:'a',sender_id:'me',recipient_id:'friend',status:'accepted',recipient:{id:'friend',nickname:'바다친구',equipped_title:'바다를 잇는 다정함'}},{id:'b',sender_id:'new',recipient_id:'me',status:'accepted',sender:{id:'new',nickname:'새친구'}}]
 levelApi.loadPlayerLevels.mockResolvedValue([{userId:'friend',level:42},{userId:'new',level:1}])
 render(<MemoryRouter><PlayerLevelsProvider><FriendsPage/></PlayerLevelsProvider></MemoryRouter>)
 expect(await screen.findByLabelText('레벨 42')).toBeTruthy()
 expect(screen.getByLabelText('레벨 1')).toBeTruthy()
 expect(screen.getByText('바다를 잇는 다정함').className).toContain('text-violet-600')
 expect(levelApi.loadPlayerLevels).toHaveBeenCalledTimes(1)
})
it('keeps friend actions available when level lookup fails and retries on focus',async()=>{
 mock.social.loading=false
 mock.social.requests=[{id:'a',sender_id:'me',recipient_id:'friend',status:'accepted',recipient:{id:'friend',nickname:'바다친구'}}]
 levelApi.loadPlayerLevels.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([{userId:'friend',level:10}])
 render(<MemoryRouter><PlayerLevelsProvider><FriendsPage/></PlayerLevelsProvider></MemoryRouter>)
 await waitFor(()=>expect(levelApi.loadPlayerLevels).toHaveBeenCalledOnce())
 expect(screen.queryByRole('button',{name:/레벨/})).toBeNull()
 expect(screen.getByRole('link',{name:'바다친구의 아쿠아리움 방문'})).toBeTruthy()
 fireEvent.focus(window)
 await waitFor(()=>expect(screen.getByLabelText('레벨 10')).toBeTruthy())
})

it('shows presence without covering levels, counts online friends and filters out away/offline friends',()=>{
 mock.social.loading=false;levelApi.loadPlayerLevels.mockResolvedValue([])
 mock.social.requests=['live','away','off'].map(id=>({id,sender_id:'me',recipient_id:id,status:'accepted',recipient:{id,nickname:id}}))
 mock.presence.friends=[{friend_id:'live',state:'online'},{friend_id:'away',state:'away'},{friend_id:'off',state:'offline'}]
 render(<MemoryRouter><PlayerLevelsProvider><FriendsPage/></PlayerLevelsProvider></MemoryRouter>)
 expect(screen.getByText('친구 3명 · 접속 중 1명')).toBeTruthy()
 expect(screen.getByLabelText('live 접속 중')).toBeTruthy()
 expect(screen.getByLabelText('away 잠시 자리 비움')).toBeTruthy()
 expect(screen.getByLabelText('off 미접속')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'접속 중만 보기'}))
 expect(screen.getByRole('link',{name:'live의 아쿠아리움 방문'})).toBeTruthy()
 expect(screen.queryByText('away')).toBeNull();expect(screen.queryByText('off')).toBeNull()
 expect(screen.getByRole('button',{name:'접속 중만 보기'}).getAttribute('aria-pressed')).toBe('true')
})
it('keeps unknown status distinct from offline and explains an empty online filter',()=>{
 mock.social.loading=false;levelApi.loadPlayerLevels.mockResolvedValue([])
 mock.social.requests=[{id:'a',sender_id:'me',recipient_id:'friend',status:'accepted',recipient:{id:'friend',nickname:'바다친구'}}]
 mock.presence={friends:[],ready:false,error:true}
 const view=render(<MemoryRouter><PlayerLevelsProvider><FriendsPage/></PlayerLevelsProvider></MemoryRouter>)
 expect(screen.getByLabelText('바다친구 상태 확인 불가')).toBeTruthy()
 expect(screen.queryByText('미접속')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'접속 중만 보기'}))
 expect(screen.getByText('접속 상태를 확인하면 친구를 표시할게요.')).toBeTruthy()
 mock.presence={friends:[{friend_id:'friend',state:'offline'}],ready:true,error:false}
 view.rerender(<MemoryRouter><PlayerLevelsProvider><FriendsPage/></PlayerLevelsProvider></MemoryRouter>)
 expect(screen.getByText('지금 접속 중인 친구가 없어요.')).toBeTruthy()
})
