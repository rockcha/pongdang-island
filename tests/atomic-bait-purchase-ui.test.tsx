import {useEffect} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {BaitShop} from '@/features/fishing/bait-shop'
import {GoldProvider,useGold} from '@/features/gold/gold-provider'
const mock=vi.hoisted(()=>({load:vi.fn(),buy:vi.fn(),sound:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'buyer'}}})}))
vi.mock('@/features/gold/api',()=>({loadGold:mock.load,readGold:mock.load,transactGold:mock.buy,goldError:()=> '연결을 다시 확인해주세요.'}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:mock.sound,playSaleSound:vi.fn(),playRewardSound:vi.fn()}))
vi.mock('@/features/fishing/api',()=>({loadFishing:async()=>({baits:[{id:'bait',name:'테스트 미끼',description:'미끼',image_path:'/bait.png',price:10,effect_description:'효과'}]})}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('updates visible gold directly from the initial balance to the total charge once',async()=>{
 const balances:number[]=[]
 function Balance(){const {wallet,loading}=useGold();useEffect(()=>{if(!loading)balances.push(wallet.gold)},[wallet.gold,loading]);return <output aria-label="잔액">{wallet.gold}</output>}
 const wallet={gold:1000,inventory:{bait:0},testClaimed:false,testEnabled:false}
 mock.load.mockResolvedValue(wallet)
 let finish:(value:unknown)=>void=()=>{}
 mock.buy.mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 render(<GoldProvider><Balance/><BaitShop/></GoldProvider>)
 await waitFor(()=>expect(screen.getByLabelText('잔액').textContent).toBe('1000'))
 fireEvent.click(await screen.findByRole('button',{name:'테스트 미끼 상세 보기'}))
 fireEvent.change(screen.getByRole('spinbutton',{name:'구매 수량'}),{target:{value:'30'}})
 fireEvent.click(screen.getByRole('button',{name:'테스트 미끼 30개 구매'}))
 expect(mock.buy).toHaveBeenCalledTimes(1)
 expect(mock.buy.mock.calls[0][0]).toMatchObject({quantity:30,expectedPrice:10})
 expect(screen.getByLabelText('잔액').textContent).toBe('1000')
 await act(async()=>finish({...wallet,gold:700,inventory:{bait:30},delta:-300}))
 expect(screen.getByLabelText('잔액').textContent).toBe('700')
 expect(balances).toEqual([1000,700])
 expect(mock.sound).toHaveBeenCalledTimes(1)
 expect(screen.getByText('−300')).toBeTruthy()
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(1)
})
