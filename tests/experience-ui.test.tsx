import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {ExperienceProvider} from '@/features/experience/experience-provider'
import {ExperienceProgress,LevelBadge} from '@/features/experience/experience-display'
import {experienceChanged} from '@/features/experience/api'

const mocked=vi.hoisted(()=>({userId:'first',rpc:vi.fn(),toast:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:mocked.userId}}})}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:mocked.rpc})}))
vi.mock('sonner',()=>({toast:{success:mocked.toast}}))
const first={level:3,totalXp:400,currentXp:150,nextLevelXp:200,legacyXp:300}
function View(){return <MemoryRouter><ExperienceProvider><LevelBadge/><ExperienceProgress/></ExperienceProvider></MemoryRouter>}
afterEach(()=>{cleanup();vi.useRealTimers();vi.resetAllMocks();mocked.userId='first'})

it('displays authoritative carryover and historical XP without announcing the initial load',async()=>{
 mocked.rpc.mockResolvedValue({data:first,error:null})
 render(<View/>)
 const badge=await screen.findByRole('button',{name:'레벨 3 확인'})
 expect(badge.getAttribute('aria-haspopup')).toBe('dialog')
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('150')
 expect(screen.getByText('다음 레벨까지 50 XP')).toBeTruthy()
 expect(screen.queryByText(/기존 낚시 기록.*XP 반영/)).toBeNull()
 expect(mocked.toast).not.toHaveBeenCalled()
 expect(document.body.querySelectorAll('[data-experience-effect]')).toHaveLength(0)
})
it('announces a server-confirmed level gain once, even when an activity is retried',async()=>{
 const next={...first,level:4,totalXp:500,currentXp:50,nextLevelXp:250}
 mocked.rpc.mockResolvedValueOnce({data:first,error:null}).mockResolvedValue({data:next,error:null})
 const {container}=render(<View/>)
 await screen.findByRole('button',{name:'레벨 3 확인'})
 act(()=>experienceChanged())
 await screen.findByRole('button',{name:'레벨 4 확인'})
 expect(screen.getByText('Lv.4 달성!')).toBeTruthy()
 expect(screen.getByText('+100 XP')).toBeTruthy()
 expect(container.querySelector('[data-experience-effects]')).toBeNull()
 expect(document.body.querySelector('[data-experience-effects]')?.className).toContain('pointer-events-none fixed inset-0')
 act(()=>experienceChanged())
 await waitFor(()=>expect(mocked.rpc).toHaveBeenCalledTimes(3))
 expect(document.body.querySelectorAll('[data-experience-effect]')).toHaveLength(1)
 expect(mocked.toast).not.toHaveBeenCalled()
})
it('does not show or announce the previous account after switching users',async()=>{
 let resolve:(value:unknown)=>void=()=>{}
 mocked.rpc.mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockResolvedValue({data:{level:1,totalXp:0,currentXp:0,nextLevelXp:100,legacyXp:0},error:null})
 const view=render(<View/>)
 mocked.userId='second';view.rerender(<View/>)
 await screen.findByRole('button',{name:'레벨 1 확인'})
 await act(async()=>resolve({data:first,error:null}))
 expect(screen.queryByRole('button',{name:'레벨 3 확인'})).toBeNull()
 expect(mocked.toast).not.toHaveBeenCalled()
})
it('keeps progress on refresh failure and retries without issuing a reward',async()=>{
 mocked.rpc.mockResolvedValueOnce({data:first,error:null}).mockResolvedValueOnce({data:null,error:{message:'offline'}}).mockResolvedValue({data:first,error:null})
 render(<View/>)
 await screen.findByRole('button',{name:'레벨 3 확인'})
 act(()=>experienceChanged())
 fireEvent.click(await screen.findByRole('button',{name:'경험치를 불러오지 못했어요. 다시 확인'}))
 await waitFor(()=>expect(screen.queryByRole('button',{name:'경험치를 불러오지 못했어요. 다시 확인'})).toBeNull())
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('150')
 expect(mocked.toast).not.toHaveBeenCalled()
})
it('ignores stale responses when a later refresh completes first',async()=>{
 let resolve:(value:unknown)=>void=()=>{}
 mocked.rpc.mockResolvedValueOnce({data:first,error:null}).mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockResolvedValue({data:{...first,totalXp:420,currentXp:170},error:null})
 render(<View/>)
 await screen.findByRole('button',{name:'레벨 3 확인'})
 act(()=>experienceChanged());act(()=>experienceChanged())
 await waitFor(()=>expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('170'))
 await act(async()=>resolve({data:first,error:null}))
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('170')
 expect(screen.getByText('+20 XP')).toBeTruthy()
 expect(document.body.querySelectorAll('[data-experience-effect]')).toHaveLength(1)
})

it('removes the central effect after the shared gold animation duration and clears it on account changes',async()=>{
 mocked.rpc.mockResolvedValueOnce({data:first,error:null}).mockResolvedValue({data:{...first,totalXp:430,currentXp:180},error:null})
 const view=render(<View/>)
 await screen.findByRole('button',{name:'레벨 3 확인'})
 vi.useFakeTimers()
 await act(async()=>experienceChanged())
 expect(screen.getByText('+30 XP')).toBeTruthy()
 act(()=>vi.advanceTimersByTime(1400))
 expect(document.body.querySelectorAll('[data-experience-effect]')).toHaveLength(0)
 mocked.rpc.mockResolvedValue({data:{...first,totalXp:440,currentXp:190},error:null})
 await act(async()=>experienceChanged())
 expect(screen.getByText('+10 XP')).toBeTruthy()
 mocked.userId='second'
 await act(async()=>view.rerender(<View/>))
 expect(document.body.querySelectorAll('[data-experience-effect]')).toHaveLength(0)
 view.unmount()
 expect(vi.getTimerCount()).toBe(0)
})
