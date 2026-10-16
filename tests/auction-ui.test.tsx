import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {AuctionPage} from '@/features/auctions/auction-page'
const mock=vi.hoisted(()=>({load:vi.fn(),bid:vi.fn(),refresh:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({wallet:{gold:1000},loading:false,error:'',refresh:mock.refresh}),GoldIcon:()=>null}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({refresh:mock.refresh})}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
vi.mock('@/features/auctions/api',async original=>({...await original<typeof import('@/features/auctions/api')>(),loadAuctions:mock.load,bidAuction:mock.bid}))
const auction={id:'auction',owner_id:'seller',owner_name:'Seller',title:'해삼 경매',description:'설명',offer:{kind:'collectible',id:'soft-sea-cucumber',name:'말랑 해삼',quantity:1,thumbnail_path:null},minimum_price:300,duration_days:1,highest_amount:500,highest_bidder:'other',status:'active',created_at:new Date().toISOString(),ends_at:new Date(Date.now()+86400000).toISOString()}
beforeEach(()=>{vi.clearAllMocks();mock.load.mockResolvedValue({items:[auction],total:1,serverNow:new Date().toISOString()});mock.bid.mockResolvedValue(auction);mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
it('explains mailbox refunds and keeps the same bid operation after a transport failure',async()=>{
 mock.bid.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(auction)
 render(<AuctionPage/>);fireEvent.click(await screen.findByRole('button',{name:'입찰하기'}))
 const dialog=screen.getByRole('alertdialog')
 expect(within(dialog).getByText(/전액을 선물함으로/)).toBeTruthy()
 fireEvent.click(within(dialog).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.bid).toHaveBeenCalledOnce());await screen.findByRole('alert')
 fireEvent.click(within(dialog).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.bid).toHaveBeenCalledTimes(2))
 expect(mock.bid.mock.calls[0]).toEqual(mock.bid.mock.calls[1])
 expect(mock.bid.mock.calls[0].slice(0,2)).toEqual(['auction',501])
})
it('shows only the additional escrow amount when raising your own highest bid',async()=>{
 mock.load.mockResolvedValue({items:[{...auction,highest_bidder:'me'}],total:1,serverNow:new Date().toISOString()})
 render(<AuctionPage/>);fireEvent.click(await screen.findByRole('button',{name:'입찰하기'}))
 fireEvent.change(screen.getByLabelText('입찰 금액'),{target:{value:'800'}})
 expect(screen.getByText(/추가로 맡길 금액 300골드/)).toBeTruthy()
})
