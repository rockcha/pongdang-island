import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { FriendsPage } from '@/features/friends/friends-page'

const mock=vi.hoisted(()=>({social:{profile:{friend_code:'ABCDEF123456'},requests:[] as unknown[],loading:true,error:'',refresh:vi.fn()}}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>mock.social}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/friends/api',()=>({findPlayer:vi.fn(),sendFriendRequest:vi.fn()}))
vi.mock('@/features/friends/request-actions',()=>({RequestActions:()=> <button>수락</button>}))
vi.mock('@/features/friends/remove-friend-button',()=>({RemoveFriendButton:()=>null}))
afterEach(cleanup)
it('replaces loading rows with requests and opens the invite dialog from the footer',()=>{
  const view=render(<MemoryRouter><FriendsPage/></MemoryRouter>)
  expect(screen.getByRole('status',{name:'등대의 소식을 불러오는 중'})).toBeTruthy()
  mock.social.loading=false
  mock.social.requests=[{id:'request',sender_id:'friend',recipient_id:'me',status:'pending',sender:{nickname:'바다친구'}}]
  view.rerender(<MemoryRouter><FriendsPage/></MemoryRouter>)
  fireEvent.click(screen.getByRole('button',{name:'받은 요청 1'}))
  expect(screen.getByText('바다친구')).toBeTruthy()
  expect(screen.getByRole('button',{name:'수락'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'친구 초대'}))
  expect(screen.getByRole('dialog',{name:'친구와 불빛 이어가기'})).toBeTruthy()
})
