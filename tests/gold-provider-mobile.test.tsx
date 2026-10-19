import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
const {load,trade,success}=vi.hoisted(()=>({load:vi.fn(),trade:vi.fn(),success:vi.fn()}))
vi.mock('sonner',()=>({toast:{success}}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'player'}}})}))
vi.mock('@/features/gold/api',()=>({loadGold:load,transactGold:trade,goldError:()=> '오류'}))
import {GoldProvider,useGold} from '@/features/gold/gold-provider'
import {useState} from 'react'
function Buy(){const {transact,loading,busy}=useGold();return <button disabled={loading||busy} onClick={()=>void transact({type:'buy',id:'fishing:bait'})}>구매</button>}
function RefreshWallet(){const {refresh,loading}=useGold();return <button disabled={loading} onClick={()=>void refresh()}>잔액 갱신</button>}
function BuyMany({quantity=16}:{quantity?:number}){const {transact,batchEffects,loading,busy}=useGold();const[error,setError]=useState('');return <><button disabled={loading||busy} onClick={()=>void batchEffects(async()=>{for(let i=0;i<quantity;i++)await transact({type:'buy',id:'fishing:bait',name:'지렁이'})}).catch(()=>setError('부분 구매 실패'))}>{quantity}개 구매</button>{error&&<p role="alert">{error}</p>}</>}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.resetAllMocks()})
it('shows newly received gold above dialogs but skips initial balances and duplicate refreshes',async()=>{
 const wallet={gold:1000,inventory:{},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet)
 const {container}=render(<GoldProvider><RefreshWallet/></GoldProvider>)
 const button=screen.getByRole('button',{name:'잔액 갱신'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(0)
 load.mockResolvedValue({...wallet,gold:1200});fireEvent.click(button)
 expect(await screen.findByText('+200')).toBeTruthy()
 expect(container.querySelector('[data-gold-effects]')).toBeNull()
 expect(document.body.querySelector('[data-gold-effects]')?.className).toContain('z-[2147483000]')
 fireEvent.click(button);await waitFor(()=>expect(load).toHaveBeenCalledTimes(3))
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(1)
})
it('can purchase repeatedly without randomUUID on LAN HTTP',async()=>{
 const source=globalThis.crypto;vi.stubGlobal('crypto',{getRandomValues:source.getRandomValues.bind(source)})
 const wallet={gold:1000,inventory:{bait:2},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet);trade.mockResolvedValue(wallet)
 render(<GoldProvider><Buy/></GoldProvider>)
 const button=screen.getByRole('button',{name:'구매'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 fireEvent.click(button)
 await waitFor(()=>expect(trade).toHaveBeenCalledTimes(1))
 await waitFor(()=>expect(button.disabled).toBe(false))
 fireEvent.click(button)
 await waitFor(()=>expect(trade).toHaveBeenCalledTimes(2))
 expect(trade.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/)
 expect(trade.mock.calls[0][1]).not.toBe(trade.mock.calls[1][1])
})
it('shows a single total deduction for sixteen bait purchases',async()=>{
 const wallet={gold:1000,inventory:{bait:0},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet);trade.mockResolvedValue({...wallet,delta:-30})
 render(<GoldProvider><BuyMany/></GoldProvider>)
 const button=screen.getByRole('button',{name:'16개 구매'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 fireEvent.click(button)
 expect(await screen.findByText('−480')).toBeTruthy()
 expect(trade).toHaveBeenCalledTimes(16)
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(1)
 expect(screen.queryByText('−30')).toBeNull()
})
it('aggregates only confirmed deductions when the third purchase fails',async()=>{
 const wallet={gold:1000,inventory:{bait:0},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet);trade.mockResolvedValueOnce({...wallet,delta:-30}).mockResolvedValueOnce({...wallet,delta:-30}).mockRejectedValueOnce(new Error('offline'))
 render(<GoldProvider><BuyMany/></GoldProvider>)
 const button=screen.getByRole('button',{name:'16개 구매'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 fireEvent.click(button)
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','부분 구매 실패')
 expect(screen.getByText('−60')).toBeTruthy()
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(1)
 expect(trade).toHaveBeenCalledTimes(3)
})

it('includes the confirmed bait quantity in a single purchase toast',async()=>{
 const wallet={gold:1000,inventory:{bait:0},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet);trade.mockResolvedValue({...wallet,delta:-30})
 render(<GoldProvider><BuyMany quantity={5}/></GoldProvider>)
 const button=screen.getByRole('button',{name:'5개 구매'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 fireEvent.click(button)
 expect(await screen.findByText('−150')).toBeTruthy()
 expect(success).toHaveBeenCalledTimes(1)
 expect(success).toHaveBeenCalledWith('지렁이 5마리 구매했습니다.')
})
