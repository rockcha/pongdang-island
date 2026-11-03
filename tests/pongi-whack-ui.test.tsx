import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import PongiWhackGame from '@/features/arcade/pongi-whack-game'
import {whackReworkMessage,whackReworkSchedule} from '@/features/arcade/pongi-whack-maintenance'
import type {WhackState} from '@/features/arcade/pongi-whack-api'
const mocks=vi.hoisted(()=>({command:vi.fn(),account:{data:{serverNow:'',gold:100,run:null} as WhackState,dataUpdatedAt:0,refetch:vi.fn()}}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/relics/use-equipped-relic',()=>({useEquippedRelic:()=>null}))
vi.mock('@/lib/account-query',async original=>({...await original<typeof import('@/lib/account-query')>(),useAccountResource:()=>mocks.account}))
vi.mock('@/features/arcade/pongi-whack-api',async original=>({...await original<typeof import('@/features/arcade/pongi-whack-api')>(),actWhack:mocks.command}))
let frames:Map<number,FrameRequestCallback>,frameId:number,now:number
beforeEach(()=>{vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-11-01T12:00:00+09:00'));now=0;frames=new Map();frameId=0;vi.clearAllMocks();vi.spyOn(performance,'now').mockImplementation(()=>now);vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++frameId,cb);return frameId});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{frames.delete(id)});mocks.account.dataUpdatedAt=Date.now();mocks.account.data={serverNow:new Date(Date.now()).toISOString(),gold:100,run:null}})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
const advance=async(ms:number)=>{now=ms;await act(async()=>{const current=[...frames.values()];frames.clear();current.forEach(cb=>cb(ms))})}
it('blocks both new game modes using server time while keeping ranking available',()=>{
 mocks.account.data={serverNow:'2026-11-02T00:00:00+09:00',gold:100,run:null,maintenance:{...whackReworkSchedule,active:true}}
 render(<PongiWhackGame/>)
 expect(screen.getByRole('button',{name:'실전 (골드 10)'})).toHaveProperty('disabled',true)
 expect(screen.getByRole('button',{name:'연습'})).toHaveProperty('disabled',true)
 expect(screen.getByText(whackReworkMessage)).toBeTruthy()
 expect(screen.getByRole('tab',{name:'랭킹'})).toHaveProperty('disabled',false)
 expect(mocks.command).not.toHaveBeenCalled()
 expect(screen.queryByRole('button',{name:'개편 연습하기'})).toBeNull()
})
it('updates an already-open start menu at midnight without polling',async()=>{
 vi.useFakeTimers({toFake:['Date','setTimeout','clearTimeout']})
 vi.setSystemTime(new Date('2026-11-01T23:59:59+09:00'))
 mocks.account.dataUpdatedAt=Date.now()
 mocks.account.data={serverNow:new Date(Date.now()).toISOString(),gold:100,run:null,maintenance:whackReworkSchedule}
 render(<PongiWhackGame/>)
 expect(screen.getByRole('button',{name:'연습'})).toHaveProperty('disabled',false)
 await act(async()=>{await vi.advanceTimersByTimeAsync(1001)})
 expect(screen.getByRole('button',{name:'연습'})).toHaveProperty('disabled',true)
 expect(screen.getByRole('button',{name:'실전 (골드 10)'})).toHaveProperty('disabled',true)
 expect(mocks.command).not.toHaveBeenCalled()
 expect(mocks.account.refetch).not.toHaveBeenCalled()
})
it('prevents confirming a fee after a previously-open confirmation crosses midnight',async()=>{
 vi.useFakeTimers({toFake:['Date','setTimeout','clearTimeout']})
 vi.setSystemTime(new Date('2026-11-01T23:59:59+09:00'))
 mocks.account.dataUpdatedAt=Date.now()
 mocks.account.data={serverNow:new Date(Date.now()).toISOString(),gold:100,run:null,maintenance:whackReworkSchedule}
 render(<PongiWhackGame/>)
 fireEvent.click(screen.getByRole('button',{name:'실전 (골드 10)'}))
 const dialog=screen.getByRole('alertdialog')
 expect(within(dialog).getByRole('button',{name:'확인'})).toHaveProperty('disabled',false)
 await act(async()=>{await vi.advanceTimersByTimeAsync(1001)})
 expect(within(dialog).getByRole('button',{name:'확인'})).toHaveProperty('disabled',true)
 expect(mocks.command).not.toHaveBeenCalled()
})
it('allows an already-paid run to resume during the rework pause',async()=>{
 const run={id:'already-paid',startedAt:'2026-11-01T23:59:55+09:00',targets:[],finishedAt:null,abandoned:false,score:0,mistakes:0}
 mocks.account.data={serverNow:'2026-11-02T00:00:01+09:00',gold:90,run,maintenance:{...whackReworkSchedule,active:true}}
 mocks.command.mockResolvedValue(mocks.account.data)
 render(<PongiWhackGame/>)
 fireEvent.click(screen.getByRole('button',{name:'진행 중인 실전 이어하기'}))
 await waitFor(()=>expect(screen.getByLabelText('퐁이 잡기 구멍 12개')).toBeTruthy())
 expect(mocks.command).toHaveBeenCalledWith({p_action:'state'})
 expect(mocks.command).not.toHaveBeenCalledWith(expect.objectContaining({p_action:'start'}))
})
it('honors a server release and allows practice again',()=>{
 mocks.account.data={serverNow:'2026-11-03T12:00:00+09:00',gold:100,run:null,maintenance:{...whackReworkSchedule,releasedAt:'2026-11-03T10:00:00+09:00',active:false}}
 render(<PongiWhackGame/>)
 expect(screen.getByRole('button',{name:'연습'})).toHaveProperty('disabled',false)
 expect(screen.getByRole('button',{name:'실전 (골드 10)'})).toHaveProperty('disabled',false)
})
it('plays a complete free round without paid commands and excludes practice from ranking',async()=>{
 vi.spyOn(Math,'random').mockReturnValue(.9)
 render(<PongiWhackGame/>);fireEvent.click(screen.getByRole('button',{name:'연습'}))
 await advance(3700)
 const target=screen.getByRole('button',{name:'11번 구멍 퐁이'})
 fireEvent.pointerDown(target,{button:0});fireEvent.click(target,{detail:0})
 expect(screen.getByLabelText('현재 점수').textContent).toContain('1')
 expect(screen.getByRole('progressbar',{name:'남은 시간'}).getAttribute('aria-valuenow')).toBe('29.3')
 await advance(18000)
 expect(screen.getByRole('progressbar',{name:'남은 시간'}).getAttribute('aria-valuenow')).toBe('15')
 expect(screen.getByRole('progressbar',{name:'남은 시간'}).querySelector('i')?.style.transform).toBe('scaleX(0.5)')
 expect(screen.queryByText('퐁이 +1 · 황금 +10 · 폭탄·조개 가짜·건초 −2')).toBeNull()
 await advance(34000)
 expect(screen.getByText('연습 완료!')).toBeTruthy();expect(mocks.command).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'시작 화면으로'}))
 expect(screen.getByRole('button',{name:'연습'})).toBeTruthy()
})
it('starts paid play once, retains the operation id after a network failure and submits a verified result',async()=>{
 const start={id:'run-1',startedAt:new Date(Date.now()+3000).toISOString(),targets:[{id:0,hole:0,at:500,until:1500,kind:'pongi'}],finishedAt:null,abandoned:false,score:0,mistakes:0}
 mocks.command.mockRejectedValueOnce(new Error('NETWORK')).mockResolvedValueOnce({serverNow:new Date(Date.now()).toISOString(),gold:90,run:start}).mockResolvedValue({serverNow:new Date(Date.now()).toISOString(),gold:90,run:{...start,score:1,rewardGold:1,finishedAt:new Date(Date.now()).toISOString()}})
 render(<PongiWhackGame/>);fireEvent.click(screen.getByRole('button',{name:'실전 (골드 10)'}))
 expect(mocks.command).not.toHaveBeenCalled()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(screen.getByRole('alert')).toBeTruthy())
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 expect(mocks.command.mock.calls[0][0].p_operation_id).toBe(mocks.command.mock.calls[1][0].p_operation_id)
 await advance(3700);fireEvent.click(screen.getByRole('button',{name:'1번 구멍 퐁이'}),{detail:0})
 await advance(34000)
 await waitFor(()=>expect(screen.getByText('도전 완료!')).toBeTruthy())
 expect(screen.getByLabelText('골드 1 획득')).toBeTruthy()
 expect(mocks.command.mock.calls.at(-1)?.[0]).toMatchObject({p_action:'finish',p_run_id:'run-1',p_hits:[{id:0,ms:expect.any(Number)}]})
})
