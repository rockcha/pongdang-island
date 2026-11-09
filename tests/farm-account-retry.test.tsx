import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {AccountFarm} from '@/features/farm/account-farm'
import {FarmAccountError} from '@/features/farm/account-api'
import {initialAccountFarm} from '@/features/farm/account-engine'
import {setQueryAccount} from '@/lib/account-cache'
const mocks=vi.hoisted(()=>({command:vi.fn(),refetch:vi.fn(),snapshot:null as any}))
vi.mock('@/lib/account-query',()=>({useAccountResource:(key:string)=>key==='farm'?{data:mocks.snapshot,refetch:mocks.refetch}:{data:mocks.snapshot.wallet}}))
vi.mock('@/features/farm/account-api',async original=>({...await original<typeof import('@/features/farm/account-api')>(),commandAccountFarm:mocks.command}))
vi.mock('@/features/farm/topview-farm',()=>({TopviewFarm:({account}:any)=><><button onClick={()=>void account.execute({type:'buyLand',quantity:1})}>농장 구매</button>{[10,11,12].map(id=><button key={id} onClick={()=>void account.execute({type:'simulate',id,action:{type:'plant',crop:'wheat'}})}>심기 {id}</button>)}</>}))
beforeEach(()=>{mocks.command.mockReset();mocks.refetch.mockReset();mocks.snapshot={state:{...initialAccountFarm(),gold:5000},wallet:{gold:5000},revision:3,serverNow:new Date().toISOString(),sampledAt:Date.now()}})
afterEach(()=>{cleanup();vi.useRealTimers();setQueryAccount(null)})
it('blocks automatic and unrelated writes after uncertain failure, then retries the exact original operation once',async()=>{
 mocks.command.mockRejectedValueOnce(new FarmAccountError('다시 확인해주세요.',false,'FARM_UNAVAILABLE')).mockResolvedValueOnce(mocks.snapshot)
 render(<AccountFarm/>);fireEvent.click(screen.getByRole('button',{name:'농장 구매'}))
 await screen.findByRole('button',{name:'이전 작업 결과 확인'})
 fireEvent.click(screen.getByRole('button',{name:'농장 구매'}));expect(mocks.command).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByRole('button',{name:'이전 작업 결과 확인'}))
 await waitFor(()=>expect(mocks.command).toHaveBeenCalledTimes(2))
 expect(mocks.command.mock.calls[1]).toEqual(mocks.command.mock.calls[0])
 await waitFor(()=>expect(screen.queryByRole('button',{name:'이전 작업 결과 확인'})).toBeNull())
})
it('locks a rapid double click and refreshes a definite state conflict without retrying it',async()=>{
 let reject!:(reason:unknown)=>void;mocks.command.mockImplementation(()=>new Promise((_,r)=>{reject=r}));mocks.refetch.mockResolvedValue({data:mocks.snapshot})
 render(<AccountFarm/>);const buy=screen.getByRole('button',{name:'농장 구매'})
 fireEvent.click(buy);fireEvent.click(buy);expect(mocks.command).toHaveBeenCalledTimes(1)
 reject(new FarmAccountError('상태가 바뀌었어요.',true,'FARM_STATE_CONFLICT'))
 await waitFor(()=>expect(mocks.refetch).toHaveBeenCalledTimes(1))
 expect(screen.queryByRole('button',{name:'이전 작업 결과 확인'})).toBeNull()
})
it('queues planting behind a save, batches adjacent intentions and uses confirmed revisions before a cache render',async()=>{
 const resolve:Array<(value:any)=>void>=[]
 mocks.command.mockImplementation(()=>new Promise(done=>resolve.push(done)))
 render(<AccountFarm/>);fireEvent.click(screen.getByText('농장 구매'))
 fireEvent.click(screen.getByText('심기 10'));fireEvent.click(screen.getByText('심기 11'))
 expect(mocks.command).toHaveBeenCalledTimes(1)
 await act(async()=>{resolve[0]({...mocks.snapshot,revision:4})})
 expect(mocks.command).toHaveBeenCalledTimes(2)
 expect(mocks.command.mock.calls[1][0]).toEqual({type:'batch',commands:[10,11].map(id=>({type:'simulate',id,action:{type:'plant',crop:'wheat'}}))})
 expect(mocks.command.mock.calls[1][1]).toBe(4)
 fireEvent.click(screen.getByText('심기 12'))
 await act(async()=>{resolve[1]({...mocks.snapshot,revision:5})})
 expect(mocks.command.mock.calls[2][1]).toBe(5)
 await act(async()=>{resolve[2]({...mocks.snapshot,revision:6})})
})
it('cancels queued intentions on uncertainty and only confirms the original operation on explicit retry',async()=>{
 let reject!:(reason:unknown)=>void
 mocks.command.mockImplementationOnce(()=>new Promise((_,fail)=>{reject=fail})).mockResolvedValue({...mocks.snapshot,revision:4})
 render(<AccountFarm/>);fireEvent.click(screen.getByText('농장 구매'));fireEvent.click(screen.getByText('심기 10'))
 await act(async()=>{reject(new FarmAccountError('결과 확인 필요',false,'FARM_UNAVAILABLE'))})
 expect(mocks.command).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByText('이전 작업 결과 확인'))
 await waitFor(()=>expect(mocks.command).toHaveBeenCalledTimes(2))
 expect(mocks.command.mock.calls[1]).toEqual(mocks.command.mock.calls[0])
 expect(mocks.command).toHaveBeenCalledTimes(2)
})
it('hides short saves and shows a small nonblocking indicator only after 700ms',async()=>{
 vi.useFakeTimers()
 let resolve!:(value:any)=>void
 mocks.command.mockImplementation(()=>new Promise(done=>{resolve=done}))
 render(<AccountFarm/>);fireEvent.click(screen.getByText('농장 구매'))
 expect(screen.queryByText('농장 저장 중…')).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(699)})
 expect(screen.queryByText('농장 저장 중…')).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(1)})
 expect(screen.getByText('농장 저장 중…').className).toContain('pointer-events-none')
 await act(async()=>{resolve({...mocks.snapshot,revision:4})})
 expect(screen.queryByText('농장 저장 중…')).toBeNull()
})
it('does not send queued commands or expose an old response after switching A to B to A',async()=>{
 setQueryAccount('A')
 let resolve!:(value:any)=>void
 mocks.command.mockImplementation(()=>new Promise(done=>{resolve=done}))
 render(<AccountFarm/>);fireEvent.click(screen.getByText('농장 구매'));fireEvent.click(screen.getByText('심기 10'))
 setQueryAccount('B');setQueryAccount('A')
 await act(async()=>{resolve({...mocks.snapshot,revision:4})})
 expect(mocks.command).toHaveBeenCalledTimes(1)
 expect(screen.queryByText('이전 작업 결과 확인')).toBeNull()
})
