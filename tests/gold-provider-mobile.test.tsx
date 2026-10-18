import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
const {load,trade}=vi.hoisted(()=>({load:vi.fn(),trade:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'player'}}})}))
vi.mock('@/features/gold/api',()=>({loadGold:load,transactGold:trade,goldError:()=> '오류'}))
import {GoldProvider,useGold} from '@/features/gold/gold-provider'
function Buy(){const {transact,loading,busy}=useGold();return <button disabled={loading||busy} onClick={()=>void transact({type:'buy',id:'fishing:bait'})}>구매</button>}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.resetAllMocks()})
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
