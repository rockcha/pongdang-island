import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router'
import {ShopPage} from '@/features/gold/shop-page'
import {PlaceBanner} from '@/components/place-banner'
import {FishingRodSelector,FishingRodShop} from '@/features/fishing/fishing-rod-ui'
import {TensionFishingGame} from '@/features/fishing/tension-fishing-game'
import {WarehousePage} from '@/features/fishing/warehouse-page'
import {RodProvider} from '@/features/fishing/rod-provider'
import {fishingRods} from '@/features/fishing/fishing-rods'
const {transact,user,server,load,equip}=vi.hoisted(()=>({transact:vi.fn(),user:{id:'rod-ui'},server:{owned:['basic'],selected:'basic'},load:vi.fn(),equip:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user}})}))
vi.mock('@/features/fishing/rod-api',()=>({loadRods:load,equipRod:equip,rodError:()=> '낚싯대를 불러오지 못했어요.'}))
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null,useGold:()=>({wallet:{gold:10000,inventory:{bait:7}},transact,loading:false,busy:false,error:'',testClaimed:false,testEnabled:true,refresh:vi.fn()})}))
function snapshot(){return {...server,owned:[...server.owned],catalog:fishingRods.map(rod=>({id:rod.id,name:rod.name,price:rod.price,region_id:rod.region??null,failure_reduction_bp:rod.failureReductionBp,native_bonus_bp:rod.nativeBonusBp})),baits:[{id:'bait',name:'퐁당 지렁이',description:'기본 미끼',image_path:'/items/baits/pongdang-worm.png'}]}}
beforeEach(()=>{
 user.id+='-next';server.owned=['basic'];server.selected='basic'
 load.mockImplementation(async()=>snapshot())
 equip.mockImplementation(async(id:string)=>{server.selected=id;return snapshot()})
 transact.mockImplementation(async(action:{type:string;id:string})=>{
  const id=action.id.slice(4)
  if(action.type==='buy')server.owned.push(id)
  else{server.owned=server.owned.filter(rod=>rod!==id);if(server.selected===id)server.selected='basic'}
 })
})
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('uses real gold trades with confirmation and enables half-price sale only for owned rods',async()=>{
 render(<MemoryRouter><RodProvider><PlaceBanner pathname="/shop"/><ShopPage/></RodProvider></MemoryRouter>)
 expect(screen.getByRole('heading',{level:1,name:/상인거리.*상점/})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:'낚싯대'}))
 await screen.findByRole('heading',{name:'입문용 낚싯대'})
 expect(screen.getAllByRole('heading',{level:2})).toHaveLength(fishingRods.length)
 const buy=screen.getByRole('button',{name:'청동 낚싯대 구매'}) as HTMLButtonElement
 const sell=screen.getByRole('button',{name:'청동 낚싯대 반값 판매'}) as HTMLButtonElement
 expect(sell.disabled).toBe(true)
 fireEvent.click(buy)
 expect(transact).not.toHaveBeenCalled()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(transact).toHaveBeenCalledWith({type:'buy',id:'rod:bronze'}))
 await waitFor(()=>expect(sell.disabled).toBe(false))
 fireEvent.click(sell)
 expect(within(screen.getByRole('alertdialog')).getByText('400')).toBeTruthy()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(transact).toHaveBeenCalledWith({type:'sell',id:'rod:bronze'}))
 expect(screen.queryByText(/임시 구매/)).toBeNull()
 expect(screen.queryByRole('button',{name:'입문용 낚싯대 반값 판매'})).toBeNull()
})
it('persists server equipment and renders it after returning to the fishing page',async()=>{
 server.owned.push('coral')
 render(<RodProvider><FishingRodShop/><FishingRodSelector regionId="coral"/></RodProvider>)
 await screen.findByRole('heading',{name:'산호꽃 낚싯대'})
 fireEvent.click(screen.getByRole('button',{name:'낚싯대 선택 · 입문용 낚싯대'}))
 const dialog=screen.getByRole('dialog',{name:'낚싯대 선택'})
 fireEvent.click(within(dialog).getByRole('button',{name:'산호꽃 낚싯대 선택'}))
 await waitFor(()=>expect(equip).toHaveBeenCalledWith('coral'))
 await waitFor(()=>expect(within(dialog).getByRole('button',{name:'산호꽃 낚싯대 선택'}).getAttribute('aria-pressed')).toBe('true'))
 cleanup()
 const fishing=render(<RodProvider><TensionFishingGame active={false} onCaught={vi.fn()} onCancel={vi.fn()}/></RodProvider>)
 await waitFor(()=>expect(fishing.container.querySelector('[data-equipped-reel="coral"]')).toBeTruthy())
})
it('shows only owned rods in the warehouse and the real bait quantities in its other tab',async()=>{
 render(<MemoryRouter><RodProvider><PlaceBanner pathname="/warehouse"/><WarehousePage/></RodProvider></MemoryRouter>)
 expect(screen.getByRole('heading',{name:'창고'})).toBeTruthy()
 await screen.findByRole('heading',{name:'입문용 낚싯대'})
 expect(screen.queryByRole('heading',{name:'청동 낚싯대'})).toBeNull()
 fireEvent.click(screen.getByRole('tab',{name:'미끼 창고'}))
 expect(await screen.findByRole('heading',{name:'퐁당 지렁이'})).toBeTruthy()
 expect(screen.getByText('7')).toBeTruthy()
})
it('fails closed on inventory errors and leaves a failed transaction in the confirmation',async()=>{
 transact.mockRejectedValueOnce(new Error('골드가 부족해요.'))
 render(<RodProvider><FishingRodShop/></RodProvider>)
 fireEvent.click(await screen.findByRole('button',{name:'청동 낚싯대 구매'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','골드가 부족해요.')
 cleanup();load.mockRejectedValue(new Error('offline'))
 render(<RodProvider><FishingRodShop/></RodProvider>)
 expect(await screen.findByRole('alert')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'청동 낚싯대 구매'})).toBeNull()
})
