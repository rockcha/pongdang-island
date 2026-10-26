import {act,cleanup,fireEvent,render,renderHook,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FriendTailwindButton} from '@/features/expeditions/friend-tailwind-button'
import {ActiveExpeditionCard} from '@/features/expeditions/active-expedition-card'
import {useFriendExpeditions} from '@/features/expeditions/use-friend-expeditions'
const mock=vi.hoisted(()=>({boost:vi.fn(),load:vi.fn()}))
vi.mock('@/features/expeditions/api',()=>({boostFriendExpedition:mock.boost,loadFriendExpeditions:mock.load}))
vi.mock('@/features/expeditions/expedition-controls',()=>({BoatImage:({name}:{name:string})=><img alt={name}/>}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
const sailing={friend_id:'friend',expedition_id:'trip',returns_at:'2026-10-19T01:30:00Z',boosted:false}
const now=Date.parse('2026-10-19T01:00:00Z')
beforeEach(()=>{vi.clearAllMocks()})
afterEach(cleanup)
it('disables help while not sailing, after helping, and once the return time passes',()=>{
 const props={nickname:'바다친구',now,onBoost:vi.fn()}
 const view=render(<FriendTailwindButton {...props}/>)
 expect(screen.getByRole('button',{name:'바다친구님 확인 중'})).toHaveProperty('disabled',true)
 view.rerender(<FriendTailwindButton {...props} statusError/>)
 expect(screen.getByRole('button',{name:'바다친구님 확인 불가'})).toHaveProperty('disabled',true)
 view.rerender(<FriendTailwindButton {...props} status={{...sailing,expedition_id:null,returns_at:null}}/>)
 expect(screen.getByRole('button',{name:'바다친구님 통발 없음'})).toHaveProperty('disabled',true)
 view.rerender(<FriendTailwindButton {...props} status={sailing}/>)
 expect(screen.getByRole('button',{name:'바다친구님 물고기 유인하기'})).toHaveProperty('disabled',false)
 view.rerender(<FriendTailwindButton {...props} status={{...sailing,boosted:true}}/>)
 expect(screen.getByRole('button',{name:'바다친구님 도움 완료'})).toHaveProperty('disabled',true)
 view.rerender(<FriendTailwindButton {...props} status={{...sailing,returns_at:'2026-10-19T00:59:00Z'}}/>)
 expect(screen.getByRole('button',{name:'바다친구님 통발 없음'})).toHaveProperty('disabled',true)
})
it('confirms before helping and retries the exact original trip after an uncertain response',async()=>{
 const apply=vi.fn(),reply={serverNow:'2026-10-19T01:00:00Z',friends:[{...sailing,boosted:true}]}
 mock.boost.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(reply)
 const view=render(<FriendTailwindButton nickname="바다친구" now={now} status={sailing} onBoost={apply}/>)
 fireEvent.click(screen.getByRole('button',{name:'바다친구님 물고기 유인하기'}))
 const dialog=await screen.findByRole('alertdialog')
 expect(mock.boost).not.toHaveBeenCalled()
 expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/app-icons/fish-trap.png')
 fireEvent.click(within(dialog).getByRole('button',{name:'확인'}))
 await screen.findByRole('alert')
 view.rerender(<FriendTailwindButton nickname="바다친구" now={now} status={{...sailing,expedition_id:'next-trip'}} onBoost={apply}/>)
 fireEvent.click(within(dialog).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(apply).toHaveBeenCalledWith(reply))
 expect(mock.boost.mock.calls).toEqual([['trip'],['trip']])
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
})
it('shows the destination, individual baits and expandable helper history without the removed text',()=>{
 const expedition={id:'trip',region_id:'pongdang',departed_at:'2026-10-19T01:00:00Z',returns_at:'2026-10-19T01:10:00Z',vessel_snapshot:{id:'dinghy',name:'꼬마 통발',price:0,duration_minutes:30,min_baits:3,max_baits:5,bonus_description:'',owned:true},cargo:{bait:2,safe:1},boosts:[{id:'1',nickname:'민지',avatar_path:null,minutes:10,created_at:''},{id:'2',nickname:'바다친구',avatar_path:null,minutes:10,created_at:''}]}
 render(<ActiveExpeditionCard expedition={expedition} regionName="퐁당섬 앞바다" remaining={600000} baits={[{id:'bait',name:'퐁당 지렁이',image_path:'/worm.png'},{id:'safe',name:'이슬잎 경단',image_path:'/safe.png'}]}><button>결과 수령하기</button></ActiveExpeditionCard>)
 expect(screen.getByText('퐁당섬 앞바다')).toBeTruthy()
 const sea=screen.getByRole('region',{name:'통발 해역'})
 expect(within(sea).getByText('조업 해역')).toBeTruthy()
 expect(within(sea).queryByText('이슬잎 경단')).toBeNull()
 expect(within(screen.getByRole('region',{name:'넣은 미끼'})).getByText('총 3개')).toBeTruthy()
 expect(within(screen.getByRole('list',{name:'통발에 넣은 미끼'})).getByText('이슬잎 경단')).toBeTruthy()
 expect(screen.getByRole('timer').textContent).toBe('00:10:00')
 expect(screen.queryByText('바다에서 조업 중')).toBeNull()
 expect(screen.queryByText(/귀항 예정/)).toBeNull()
 expect(screen.getByText('−20분')).toBeTruthy()
 const summary=screen.getByText('친구의 물고기 유인').closest('summary')!
 expect(summary.textContent).toContain('민지님 외 1명')
 expect(summary.closest('details')?.open).toBe(false)
 fireEvent.click(summary)
 expect(summary.closest('details')?.open).toBe(true)
 expect(screen.getByRole('list',{name:'물고기를 유인해준 친구',hidden:true}).children).toHaveLength(2)
})
it('ignores stale availability from another account',async()=>{
 let finish!:(value:unknown)=>void
 mock.load.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve})).mockResolvedValue({serverNow:'2026-10-19T01:00:00Z',friends:[]})
 const view=renderHook(({owner})=>useFriendExpeditions(owner,'friendship'),{initialProps:{owner:'first'}})
 await waitFor(()=>expect(mock.load).toHaveBeenCalledOnce())
 view.rerender({owner:'second'})
 await waitFor(()=>expect(mock.load).toHaveBeenCalledTimes(2))
 await act(async()=>{finish({serverNow:'2026-10-19T01:00:00Z',friends:[sailing]})})
 expect(view.result.current.friends).toEqual([])
})
