import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {AccountFarm} from '@/features/farm/account-farm'
import {FarmAccountError} from '@/features/farm/account-api'
import {initialAccountFarm} from '@/features/farm/account-engine'
const mocks=vi.hoisted(()=>({command:vi.fn(),refetch:vi.fn(),snapshot:null as any}))
vi.mock('@/lib/account-query',()=>({useAccountResource:(key:string)=>key==='farm'?{data:mocks.snapshot,refetch:mocks.refetch}:{data:mocks.snapshot.wallet}}))
vi.mock('@/features/farm/account-api',async original=>({...await original<typeof import('@/features/farm/account-api')>(),commandAccountFarm:mocks.command}))
vi.mock('@/features/farm/topview-farm',()=>({TopviewFarm:({account}:any)=><button onClick={()=>void account.execute({type:'buyLand',quantity:1})}>농장 구매</button>}))
beforeEach(()=>{mocks.command.mockReset();mocks.refetch.mockReset();mocks.snapshot={state:{...initialAccountFarm(),gold:5000},wallet:{gold:5000},revision:3,serverNow:new Date().toISOString(),sampledAt:Date.now()}})
afterEach(cleanup)
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
