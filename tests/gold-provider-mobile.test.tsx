import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
const {load,trade,success,purchaseSound,saleSound,rewardSound}=vi.hoisted(()=>({load:vi.fn(),trade:vi.fn(),success:vi.fn(),purchaseSound:vi.fn(),saleSound:vi.fn(),rewardSound:vi.fn()}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:purchaseSound,playSaleSound:saleSound,playRewardSound:rewardSound}))
vi.mock('sonner',()=>({toast:{success}}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'player'}}})}))
vi.mock('@/features/gold/api',()=>({loadGold:load,readGold:load,transactGold:trade,goldError:()=> '오류'}))
import {GoldProvider,useGold} from '@/features/gold/gold-provider'
import {useState} from 'react'
function Buy(){const {transact,loading,busy}=useGold();return <button disabled={loading||busy} onClick={()=>void transact({type:'buy',id:'fishing:bait'})}>구매</button>}
function RefreshWallet(){const {refresh,loading}=useGold();return <button disabled={loading} onClick={()=>void refresh()}>잔액 갱신</button>}
it('lets an island acquisition present its cost once while later gold changes still animate',async()=>{
 const wallet={gold:1000,inventory:{},delta:0,testClaimed:false,testEnabled:false};load.mockResolvedValue(wallet)
 render(<GoldProvider><RefreshWallet/></GoldProvider>);const button=screen.getByRole('button',{name:'잔액 갱신'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 window.dispatchEvent(new CustomEvent('pongdang-island-gold-effect',{detail:{owner:'player',gold:900}}));load.mockResolvedValue({...wallet,gold:900});fireEvent.click(button)
 await waitFor(()=>expect(load).toHaveBeenCalledTimes(2));await new Promise(r=>setTimeout(r,20));expect(document.body.querySelectorAll('.gold-change')).toHaveLength(0)
 load.mockResolvedValue({...wallet,gold:950});fireEvent.click(button);expect(await screen.findByText('+50')).toBeTruthy()
})
function Sell(){const {transact,loading}=useGold();return <button disabled={loading} onClick={()=>void transact({type:'sell',id:'collectibles:fish-1,fish-2'}).catch(()=>{})}>모두 판매</button>}
it('plays a single sound for a successful multi-fish sale and stays silent on failure',async()=>{
 const wallet={gold:1000,inventory:{},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet);trade.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({...wallet,delta:100})
 render(<GoldProvider><Sell/></GoldProvider>)
 const button=screen.getByRole('button',{name:'모두 판매'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 fireEvent.click(button);await waitFor(()=>expect(trade).toHaveBeenCalledOnce())
 expect(saleSound).not.toHaveBeenCalled()
 fireEvent.click(button);await waitFor(()=>expect(saleSound).toHaveBeenCalledOnce())
 expect(saleSound).toHaveBeenCalledWith(trade.mock.calls[1][1])
 expect(purchaseSound).not.toHaveBeenCalled()
})
function BuyMany({quantity=16}:{quantity?:number}){const {transact,batchEffects,loading,busy}=useGold();const[error,setError]=useState('');return <><button disabled={loading||busy} onClick={()=>void batchEffects(async()=>{for(let i=0;i<quantity;i++)await transact({type:'buy',id:'fishing:bait',name:'지렁이'})}).catch(()=>setError('부분 구매 실패'))}>{quantity}개 구매</button>{error&&<p role="alert">{error}</p>}</>}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.resetAllMocks()})
it('shows external purchase deductions once when the wallet refreshes',async()=>{
 const wallet={gold:5000,inventory:{},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet)
 render(<GoldProvider><RefreshWallet/></GoldProvider>)
 const button=screen.getByRole('button',{name:'잔액 갱신'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 load.mockResolvedValue({...wallet,gold:3400});fireEvent.click(button)
 expect(await screen.findByText('−1,600')).toBeTruthy()
 fireEvent.click(button);await waitFor(()=>expect(load).toHaveBeenCalledTimes(3))
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(1)
})
it('shows fuel gains and usage once, without animating initial inventory',async()=>{
 const wallet={gold:1000,inventory:{fuel:10},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet)
 render(<GoldProvider><RefreshWallet/></GoldProvider>)
 const button=screen.getByRole('button',{name:'잔액 갱신'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(0)
 expect(rewardSound).not.toHaveBeenCalled()
 load.mockResolvedValue({...wallet,inventory:{fuel:15}});fireEvent.click(button)
 expect(await screen.findByText('+5')).toBeTruthy()
 expect(document.body.querySelector('.gold-change img')?.getAttribute('src')).toBe('/app-icons/fuel-can.svg')
 load.mockResolvedValue({...wallet,inventory:{fuel:12}});fireEvent.click(button)
 expect(await screen.findByText('−3')).toBeTruthy()
 fireEvent.click(button);await waitFor(()=>expect(load).toHaveBeenCalledTimes(4))
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(2)
 expect(rewardSound).toHaveBeenCalledOnce()
})
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
 expect(purchaseSound).toHaveBeenCalledOnce()
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

it('keeps the combined gold effect without a purchase toast',async()=>{
 const wallet={gold:1000,inventory:{bait:0},delta:0,testClaimed:false,testEnabled:false}
 load.mockResolvedValue(wallet);trade.mockResolvedValue({...wallet,delta:-30})
 render(<GoldProvider><BuyMany quantity={5}/></GoldProvider>)
 const button=screen.getByRole('button',{name:'5개 구매'}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 fireEvent.click(button)
 expect(await screen.findByText('−150')).toBeTruthy()
 expect(success).not.toHaveBeenCalled()
})
