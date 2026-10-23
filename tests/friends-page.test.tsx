import {PlayerLevelsProvider} from '@/features/experience/player-level'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { FriendsPage } from '@/features/friends/friends-page'

const mock=vi.hoisted(()=>({social:{profile:{friend_code:'ABCDEF123456'},requests:[] as unknown[],loading:true,error:'',refresh:vi.fn()},presence:{friends:[] as {friend_id:string;state:string}[],ready:true,error:false}}))
const levelApi=vi.hoisted(()=>({loadPlayerLevels:vi.fn()}))
vi.mock('@/features/experience/api',()=>levelApi)
vi.mock('@/features/expeditions/use-friend-expeditions',()=>({useFriendExpeditions:()=>({friends:[],now:0,error:false})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>mock.social}))
vi.mock('@/features/friends/api',()=>({findPlayer:vi.fn(),sendFriendRequest:vi.fn()}))
vi.mock('@/features/friends/use-friend-presence',()=>({useFriendPresence:()=>mock.presence}))
vi.mock('@/features/friends/request-actions',()=>({RequestActions:()=> <button>수락</button>}))
vi.mock('@/features/friends/remove-friend-button',()=>({RemoveFriendButton:()=>null}))
afterEach(()=>{cleanup();mock.social.requests=[];mock.social.loading=true;mock.presence={friends:[],ready:true,error:false};vi.clearAllMocks()})
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
