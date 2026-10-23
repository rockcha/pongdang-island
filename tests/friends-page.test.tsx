import {PlayerLevelsProvider} from '@/features/experience/player-level'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { FriendsPage } from '@/features/friends/friends-page'

const mock=vi.hoisted(()=>({social:{profile:{friend_code:'ABCDEF123456'},requests:[] as unknown[],loading:true,error:'',refresh:vi.fn()}}))
const levelApi=vi.hoisted(()=>({loadPlayerLevels:vi.fn()}))
vi.mock('@/features/experience/api',()=>levelApi)
vi.mock('@/features/expeditions/use-friend-expeditions',()=>({useFriendExpeditions:()=>({friends:[],now:0,error:false})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>mock.social}))
vi.mock('@/features/friends/api',()=>({findPlayer:vi.fn(),sendFriendRequest:vi.fn()}))
vi.mock('@/features/friends/request-actions',()=>({RequestActions:()=> <button>수락</button>}))
vi.mock('@/features/friends/remove-friend-button',()=>({RemoveFriendButton:()=>null}))
afterEach(()=>{cleanup();mock.social.requests=[];mock.social.loading=true;vi.clearAllMocks()})
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
 mock.social.requests=[{id:'a',sender_id:'me',recipient_id:'friend',status:'accepted',recipient:{id:'friend',nickname:'바다친구',equipped_title:'바다 탐험가'}},{id:'b',sender_id:'new',recipient_id:'me',status:'accepted',sender:{id:'new',nickname:'새친구'}}]
 levelApi.loadPlayerLevels.mockResolvedValue([{userId:'friend',level:42},{userId:'new',level:1}])
 render(<MemoryRouter><PlayerLevelsProvider><FriendsPage/></PlayerLevelsProvider></MemoryRouter>)
 expect(await screen.findByLabelText('레벨 42')).toBeTruthy()
 expect(screen.getByLabelText('레벨 1')).toBeTruthy()
 expect(screen.getByText('바다 탐험가')).toBeTruthy()
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
