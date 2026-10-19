import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {SavingsPage} from '@/features/savings/savings-page'
import {savingsStatus} from '@/features/savings/savings-time'
import type {SavingsAccount} from '@/features/savings/api'
const mock=vi.hoisted(()=>({load:vi.fn(),change:vi.fn(),refresh:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({refresh:mock.refresh}),GoldIcon:()=>null}))
vi.mock('@/features/savings/api',async original=>({...await original<typeof import('@/features/savings/api')>(),loadSavings:mock.load,changeSavings:mock.change}))
const base={account:null,history:[],gold:10000,serverNow:'2026-10-18T12:00:00Z'}
function account(overrides:Partial<SavingsAccount>={}):SavingsAccount{return {id:'savings',term_days:7,daily_amount:1000,paid_count:1,started_at:'2026-10-17T11:00:00Z',closed_at:null,close_kind:null,payout:null,principal:1000,bonusPercent:30,expectedBonus:2100,expectedPayout:9100,maturesAt:'2026-10-24T11:00:00Z',nextOpenAt:'2026-10-18T11:00:00Z',depositDeadline:'2026-10-19T11:00:00Z',status:'due',...overrides}}
beforeEach(()=>{vi.clearAllMocks();mock.load.mockResolvedValue(base);mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
it('previews the selected total and confirms the immediate first installment',async()=>{
 mock.change.mockResolvedValue({...base,account:account(),receipt:{action:'open',accountId:'savings',payout:0,bonus:0},replayed:false})
 render(<SavingsPage/>);fireEvent.click(await screen.findByRole('button',{name:/7일.*30/}))
 expect(screen.getByText('91')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:/적금 시작하기/}))
 const dialog=screen.getByRole('alertdialog')
 expect(within(dialog).getByText(/지금 첫 10골드를 넣고/)).toBeTruthy()
 fireEvent.click(within(dialog).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.change).toHaveBeenCalledWith(expect.objectContaining({p_action:'open',p_term_days:7,p_daily_amount:10,p_operation_id:expect.any(String)})))
})
it('retains the same operation when retrying an uncertain payment',async()=>{
 mock.load.mockResolvedValue({...base,account:account()})
 mock.change.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({...base,account:account({paid_count:2,status:'waiting'}),receipt:{action:'deposit',payout:0,bonus:0},replayed:true})
 render(<SavingsPage/>);fireEvent.click(await screen.findByRole('button',{name:'납입하기 · 1,000'}))
 fireEvent.click(await screen.findByRole('button',{name:'이전 요청 결과 다시 확인'}))
 await waitFor(()=>expect(mock.change).toHaveBeenCalledTimes(2))
 expect(mock.change.mock.calls[0]).toEqual(mock.change.mock.calls[1])
})
it('explains principal-only cancellation and waits for confirmation',async()=>{
 mock.load.mockResolvedValue({...base,account:account()})
 mock.change.mockResolvedValue({...base,receipt:{action:'withdraw',payout:1000,bonus:0,closeKind:'cancelled'},replayed:false})
 render(<SavingsPage/>);fireEvent.click(await screen.findByRole('button',{name:'중도 해지'}))
 expect(mock.change).not.toHaveBeenCalled()
 const dialog=screen.getByRole('alertdialog')
 expect(within(dialog).getByText(/보너스 없이 넣은 원금 1,000골드만/)).toBeTruthy()
 fireEvent.click(within(dialog).getByRole('button',{name:'확인'}))
 await screen.findByText('맡긴 원금을 돌려받았어요.')
})
it('offers matured payout and missed principal recovery instead of another deposit',async()=>{
 mock.load.mockResolvedValue({...base,account:account({paid_count:7,principal:7000,maturesAt:'2026-10-18T11:00:00Z',nextOpenAt:null,depositDeadline:null,status:'matured'})})
 render(<SavingsPage/>);await screen.findByRole('button',{name:'저금통 열기 · 9,100'})
 expect(screen.queryByRole('button',{name:'중도 해지'})).toBeNull()
 cleanup();mock.load.mockResolvedValue({...base,account:account({depositDeadline:'2026-10-18T11:00:00Z',status:'missed'})})
 render(<SavingsPage/>);await screen.findByRole('button',{name:'원금 돌려받기 · 1,000'})
 expect(screen.queryByRole('button',{name:/납입하기/})).toBeNull()
})
it('keeps the final payment waiting until full term maturity and identifies exact deadline',()=>{
 const full=account({paid_count:7,nextOpenAt:null,depositDeadline:null})
 expect(savingsStatus(full,Date.parse(full.maturesAt)-1)).toBe('waiting')
 expect(savingsStatus(full,Date.parse(full.maturesAt))).toBe('matured')
 const due=account()
 expect(savingsStatus(due,Date.parse(due.depositDeadline!)-1)).toBe('due')
 expect(savingsStatus(due,Date.parse(due.depositDeadline!))).toBe('missed')
})
