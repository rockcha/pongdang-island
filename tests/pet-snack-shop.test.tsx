import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {petBaits} from '@/features/pets/pet-catalog'
import type {FishingBait} from '@/features/fishing/api'
const mocks=vi.hoisted(()=>({transact:vi.fn(),refetch:vi.fn(),gold:10000,baits:[] as FishingBait[]}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({wallet:{gold:mocks.gold,inventory:{pet_food:7,bait_pet_biscuit:2}},transact:mocks.transact,busy:false,loading:false,error:''}),GoldIcon:()=> <span/>}))
vi.mock('@/lib/account-query',()=>({useAccountResource:()=>({data:{baits:mocks.baits},refetch:mocks.refetch})}))
import {PetSnackShop} from '@/features/pets/pet-snack-shop'
beforeEach(()=>{mocks.gold=10000;vi.clearAllMocks();mocks.transact.mockResolvedValue(undefined);mocks.baits=petBaits.map(b=>({id:'bait_pet_'+b.id,name:b.name,description:b.description,price:b.price,image_path:`/pets/items/${b.id}_v1.webp`,pet_bp:b.petBp,common_bp:b.commonBp,rare_bp:b.rareBp,epic_bp:b.epicBp,mythic_bp:b.mythicBp,failure_bp:0,effect_kind:'fish',effect_description:'',mechanicsVersion:2}))})
afterEach(cleanup)
it('uses the server name, artwork, odds and discounted price consistently',async()=>{
 mocks.baits[0]={...mocks.baits[0],name:'서버 간식주머니',price:110,image_path:'/updated-pouch.webp',pet_bp:250,common_bp:7750}
 render(<PetSnackShop/>);expect(screen.getByText('서버 간식주머니')).toBeTruthy();expect(document.querySelector('img[src="/updated-pouch.webp"]')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'110 구매'}));expect(screen.getByText(/펫 2.5%, 일반 77.5%/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'110 · 1개 구매'}));await waitFor(()=>expect(mocks.transact).toHaveBeenCalledWith(expect.objectContaining({id:'fishing:bait_pet_starter',name:'서버 간식주머니',expectedPrice:110})))
})
it('does not advertise unregistered pet baits from local preview configuration',()=>{
 mocks.baits=[];render(<PetSnackShop/>);expect(screen.getByText('든든 사료')).toBeTruthy();for(const bait of petBaits)expect(screen.queryByText(bait.name)).toBeNull()
})
it('shows only food in the item shop, including owned stock and generated artwork',()=>{
 render(<PetSnackShop foodOnly/>);expect(screen.getByText('든든 사료')).toBeTruthy();expect(screen.getByText('보유 7개')).toBeTruthy();expect(screen.queryByText('바삭별 비스킷')).toBeNull();expect(document.querySelector('img')?.src).toContain('/pets/items/food_v1.webp')
})
it('buys ten food through the shared gold transaction, preserving purchase effects',async()=>{
 render(<PetSnackShop foodOnly/>);fireEvent.click(screen.getByRole('button',{name:'50 구매'}));fireEvent.change(screen.getByRole('spinbutton',{name:'구매 수량'}),{target:{value:'10'}});fireEvent.click(screen.getByRole('button',{name:'500 · 10개 구매'}))
 await waitFor(()=>expect(mocks.transact).toHaveBeenCalledWith({type:'buy',id:'pet:food',name:'든든 사료',quantity:10,expectedPrice:50}))
})
it('buys pet bait as inventory rather than rolling a pet at checkout',async()=>{
 render(<PetSnackShop/>);fireEvent.click(screen.getByRole('button',{name:'200 구매'}));fireEvent.change(screen.getByRole('spinbutton',{name:'구매 수량'}),{target:{value:'3'}});fireEvent.click(screen.getByRole('button',{name:'600 · 3개 구매'}))
 await waitFor(()=>expect(mocks.transact).toHaveBeenCalledWith({type:'buy',id:'fishing:bait_pet_biscuit',name:'바삭별 비스킷',quantity:3,expectedPrice:200}))
})
it('shows beginner odds and buys the starter pouch at 120 gold each',async()=>{
 render(<PetSnackShop/>);fireEvent.click(screen.getByRole('button',{name:'120 구매'}))
 expect(screen.getByText(/펫 2%, 일반 78%, 희귀 18%, 특급 1.8%, 신화 0.2%/)).toBeTruthy()
 fireEvent.change(screen.getByRole('spinbutton',{name:'구매 수량'}),{target:{value:'5'}})
 fireEvent.click(screen.getByRole('button',{name:'600 · 5개 구매'}))
 await waitFor(()=>expect(mocks.transact).toHaveBeenCalledWith({type:'buy',id:'fishing:bait_pet_starter',name:'포슬포슬 간식주머니',quantity:5,expectedPrice:120}))
})
it('keeps the same purchase quote after transport failure even if the wallet refreshes',async()=>{
 mocks.transact.mockRejectedValueOnce(new Error('network'))
 const view=render(<PetSnackShop/>);fireEvent.click(screen.getByRole('button',{name:'200 구매'}));fireEvent.change(screen.getByRole('spinbutton',{name:'구매 수량'}),{target:{value:'10'}});fireEvent.click(screen.getByRole('button',{name:'2,000 · 10개 구매'}));await screen.findByText('network')
 mocks.gold=0;view.rerender(<PetSnackShop/>);fireEvent.click(screen.getByRole('button',{name:'이전 구매 결과 다시 확인'}))
 await waitFor(()=>expect(mocks.transact).toHaveBeenCalledTimes(2));expect(mocks.transact.mock.calls[0]).toEqual(mocks.transact.mock.calls[1])
})
it('lets quantity change after a definite rejected purchase',async()=>{
 mocks.transact.mockRejectedValueOnce(Object.assign(new Error('가격 변경'),{code:'P0001'}));render(<PetSnackShop/>);fireEvent.click(screen.getByRole('button',{name:'200 구매'}));fireEvent.click(screen.getByRole('button',{name:'200 · 1개 구매'}));await screen.findByText('가격 변경');expect(screen.getByRole('spinbutton',{name:'구매 수량'}).hasAttribute('disabled')).toBe(false)
})
