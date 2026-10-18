import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {ExchangePage} from '@/features/exchange/exchange-page'
const mock=vi.hoisted(()=>({load:vi.fn(),inventory:vi.fn(),post:vi.fn(),act:vi.fn(),refresh:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({refresh:mock.refresh}),GoldIcon:()=>null}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({refresh:mock.refresh})}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span>{name} 그림</span>}))
vi.mock('@/features/exchange/api',async original=>({...await original<typeof import('@/features/exchange/api')>(),loadExchange:mock.load,loadExchangeInventory:mock.inventory,postExchange:mock.post,actExchange:mock.act}))
const fish={kind:'collectible',id:'soft-sea-cucumber',name:'말랑 해삼',quantity:1,thumbnail_path:'fish.png',available:2}
const money={kind:'gold',id:'gold',name:'골드',quantity:300,thumbnail_path:null}
const listing={id:'listing',owner_id:'other',owner_name:'섬친구',side:'sell',offer:fish,wanted:money,status:'active',taker_id:null,created_at:'2026-10-17T00:00:00Z',closed_at:null}
beforeEach(()=>{vi.clearAllMocks();mock.load.mockResolvedValue({items:[listing],total:1});mock.inventory.mockResolvedValue({gold:5000,assets:[fish]});mock.post.mockResolvedValue({...listing,owner_id:'me'});mock.act.mockResolvedValue({...listing,status:'completed'});mock.refresh.mockResolvedValue(undefined)})
afterEach(cleanup)
const setup=()=>render(<MemoryRouter><ExchangePage/></MemoryRouter>)
it('confirms what is sent and received before accepting a listing once',async()=>{
 setup();fireEvent.click(await screen.findByRole('button',{name:'구매하기'}))
 const dialog=await screen.findByRole('alertdialog')
 expect(within(dialog).getByText('내가 보내요')).toBeTruthy();expect(within(dialog).getByText('내가 받아요')).toBeTruthy()
 expect(mock.act).not.toHaveBeenCalled()
 const accept=within(dialog).getByRole('button',{name:'확인'});fireEvent.click(accept);fireEvent.click(accept)
 await waitFor(()=>expect(mock.act).toHaveBeenCalledExactlyOnceWith('listing','accept'))
})
it('retains the same post operation and conditions after a transport error',async()=>{
 mock.post.mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce({...listing,owner_id:'me'})
 setup();fireEvent.click(screen.getByRole('button',{name:'판매 등록'}))
 const picker=await screen.findByLabelText('판매할 물품 검색')
 fireEvent.change(picker,{target:{value:'해삼'}})
 expect(screen.queryByRole('combobox')).toBeNull()
 fireEvent.click(await screen.findByRole('button',{name:'말랑 해삼 선택 · 보유 2개'}))
 fireEvent.change(screen.getByLabelText('판매 가격'),{target:{value:'300'}})
 fireEvent.click(screen.getByRole('button',{name:'맡기고 판매 등록'}))
 fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.post).toHaveBeenCalledOnce())
 await screen.findAllByRole('alert')
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.post).toHaveBeenCalledTimes(2))
 expect(mock.post.mock.calls[0][0]).toEqual(mock.post.mock.calls[1][0])
 expect(mock.post.mock.calls[0][0]).toMatchObject({p_side:'sell',p_offer_kind:'collectible',p_offer_id:'soft-sea-cucumber',p_wanted_kind:'gold',p_wanted_quantity:300})
})
it('shows cancellation instead of self trading and hides completed history',async()=>{
 mock.load.mockResolvedValue({items:[{...listing,owner_id:'me'},{...listing,id:'closed',status:'completed'}],total:2})
 setup();fireEvent.click(await screen.findByRole('button',{name:'등록 취소'}))
 fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(mock.act).toHaveBeenCalledWith('listing','cancel'))
 await waitFor(()=>expect(screen.queryByText('판매 완료')).toBeNull())
})
