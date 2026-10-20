import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {RankingFriendAction} from '@/features/arcade/ranking-friend-action'
const mocks=vi.hoisted(()=>({send:vi.fn(),refresh:vi.fn(),requests:[] as any[]}))
vi.mock('@/features/friends/api',()=>({sendFriendRequest:mocks.send}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({requests:mocks.requests,refresh:mocks.refresh})}))
const player={userId:'other',friendCode:'CODE',nickname:'친구후보',mine:false}
beforeEach(()=>{vi.clearAllMocks();mocks.requests=[]})
afterEach(cleanup)
it('sends once during rapid taps and stays pending after success',async()=>{
 let finish:()=>void=()=>{}
 mocks.send.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}))
 render(<RankingFriendAction player={player}/>)
 const button=screen.getByRole('button',{name:'친구후보 · 친구 요청'})
 fireEvent.click(button);fireEvent.click(button)
 expect(mocks.send).toHaveBeenCalledExactlyOnceWith('CODE')
 finish()
 await waitFor(()=>expect(screen.getByRole('button',{name:'친구후보 · 요청 중'}).hasAttribute('disabled')).toBe(true))
 expect(mocks.refresh).toHaveBeenCalledOnce()
})
it('hides self and missing codes, and disables existing or incoming relationships',()=>{
 const view=render(<RankingFriendAction player={{...player,mine:true}}/>)
 expect(screen.queryByRole('button')).toBeNull()
 view.rerender(<RankingFriendAction player={{...player,friendCode:null}}/>)
 expect(screen.queryByRole('button')).toBeNull()
 mocks.requests=[{sender_id:'other',recipient_id:'me',status:'pending'}]
 view.rerender(<RankingFriendAction player={player}/>)
 expect(screen.getByRole('button',{name:'친구후보 · 요청 중'}).hasAttribute('disabled')).toBe(true)
 mocks.requests=[{sender_id:'me',recipient_id:'other',status:'accepted'}]
 view.rerender(<RankingFriendAction player={player}/>)
 expect(screen.getByRole('button',{name:'친구후보 · 이미 친구예요'}).hasAttribute('disabled')).toBe(true)
})
