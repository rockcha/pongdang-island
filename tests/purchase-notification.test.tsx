import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {GoldProvider,useGold} from '@/features/gold/gold-provider'
import {purchaseMessage} from '@/features/gold/purchase-message'
const {load,trade,success}=vi.hoisted(()=>({load:vi.fn(),trade:vi.fn(),success:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'buyer'}}})}))
vi.mock('@/features/gold/api',()=>({loadGold:load,transactGold:trade,goldError:()=> '구매 실패'}))
vi.mock('sonner',()=>({toast:{success}}))
const wallet={gold:5000,inventory:{},testClaimed:false,testEnabled:false}
beforeEach(()=>{load.mockResolvedValue(wallet);trade.mockResolvedValue({...wallet,gold:4200,delta:-800})})
afterEach(()=>{cleanup();vi.clearAllMocks()})
function Shop(){const {transact,loading}=useGold();return <button disabled={loading} onClick={()=>void transact({type:'buy',id:'rod:bronze'}).catch(()=>{})}>구매</button>}
it('formats specific product names and Korean object particles across purchase types',()=>{
 expect(purchaseMessage({type:'buy',id:'rod:bronze'})).toBe('청동 낚싯대를 구매했습니다.')
 expect(purchaseMessage({type:'buy',id:'bait'})).toBe('퐁당 지렁이를 구매했습니다.')
 expect(purchaseMessage({type:'buy',id:'aquarium:tank'})).toBe('새 어항을 구매했습니다.')
 expect(purchaseMessage({type:'buy',id:'background:moon',name:'달빛 바다'})).toBe('달빛 바다를 구매했습니다.')
 expect(purchaseMessage({type:'buy',id:'fishing:bait_safe',name:'안전 미끼'})).toBe('안전 미끼를 구매했습니다.')
 expect(purchaseMessage({type:'sell',id:'rod:bronze'})).toBe('청동 낚싯대를 판매했습니다.')
})
it('shows the gold deduction without a successful purchase toast',async()=>{
 render(<GoldProvider><Shop/></GoldProvider>)
 await waitFor(()=>expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false))
 fireEvent.click(screen.getByRole('button'));fireEvent.click(screen.getByRole('button'))
 expect(await screen.findByText('−800')).toBeTruthy()
 expect(success).not.toHaveBeenCalled()
 expect(trade).toHaveBeenCalledTimes(1)
})
it('keeps ambiguous retry identity without purchase toasts',async()=>{
 trade.mockRejectedValueOnce(new Error('network'))
 render(<GoldProvider><Shop/></GoldProvider>)
 await waitFor(()=>expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false))
 fireEvent.click(screen.getByRole('button'))
 await waitFor(()=>expect(trade).toHaveBeenCalledTimes(1))
 expect(success).not.toHaveBeenCalled()
 trade.mockResolvedValueOnce({...wallet,delta:0})
 fireEvent.click(screen.getByRole('button'))
 await waitFor(()=>expect(trade).toHaveBeenCalledTimes(2))
 expect(success).not.toHaveBeenCalled()
 expect(trade.mock.calls[1][1]).toBe(trade.mock.calls[0][1])
})
