import {cleanup,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MemoryRouter,Route,Routes} from 'react-router'
import {GoldProvider,useGold} from '@/features/gold/gold-provider'
import {FirstFishingGate} from '@/features/onboarding/first-fishing-gate'
const mock=vi.hoisted(()=>({wallet:vi.fn(),tutorial:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'new-player'}}})}))
vi.mock('@/features/gold/api',()=>({loadGold:mock.wallet,transactGold:vi.fn(),goldError:()=> '연결 오류'}))
vi.mock('@/features/onboarding/api',async original=>({...await original<typeof import('@/features/onboarding/api')>(),firstFishingTutorial:mock.tutorial}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
function Inventory(){const {wallet}=useGold();return <p>보유 지렁이 {wallet.inventory.bait??0}개</p>}
it('refreshes a wallet loaded before the first profile sync grants starter bait',async()=>{
 let finish!:(value:unknown)=>void
 mock.tutorial.mockReturnValue(new Promise(resolve=>{finish=resolve}))
 const wallet={gold:0,inventory:{},testClaimed:false,testEnabled:false}
 mock.wallet.mockResolvedValue(wallet)
 render(<GoldProvider><MemoryRouter initialEntries={['/first-fishing']}><Routes><Route element={<FirstFishingGate/>}><Route path="first-fishing" element={<Inventory/>}/></Route></Routes></MemoryRouter></GoldProvider>)
 await waitFor(()=>expect(mock.wallet).toHaveBeenCalledOnce())
 mock.wallet.mockResolvedValue({...wallet,inventory:{bait:10}})
 finish({required:true,step:'ready'})
 expect(await screen.findByText('보유 지렁이 10개')).toBeTruthy()
 expect(mock.wallet).toHaveBeenCalledTimes(2)
})
