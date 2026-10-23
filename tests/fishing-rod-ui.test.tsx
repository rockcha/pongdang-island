import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router'
import {ShopPage} from '@/features/gold/shop-page'
import {PlaceBanner} from '@/components/place-banner'
import {FishingRodSelector,FishingRodShop,RodEffect} from '@/features/fishing/fishing-rod-ui'
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
it('shows the calm wait bonus instead of a success bonus and keeps themed habitat bonuses',()=>{
 const calm=fishingRods.find(r=>r.id==='calm')!,theme=fishingRods.find(r=>r.id==='coral')!
 const view=render(<RodEffect rod={calm}/>)
 expect(screen.getByText('직접 낚시 대기시간 2초 단축')).toBeTruthy()
 expect(screen.queryByText(/성공 확률/)).toBeNull()
 view.rerender(<RodEffect rod={theme}/>)
 expect(screen.getByText('직접 낚시 대기시간 1초 단축')).toBeTruthy()
 expect(screen.getByText('해당 해역에서 주 서식지 개체를 만나기 쉬워져요.')).toBeTruthy()
})
it('uses real gold trades with confirmation and enables half-price sale only for owned rods',async()=>{
 render(<MemoryRouter><RodProvider><PlaceBanner pathname="/shop"/><ShopPage/></RodProvider></MemoryRouter>)
 expect(screen.getByRole('heading',{level:1,name:'낚시 상점'})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:'낚싯대'}))
 await screen.findByRole('heading',{name:'입문용 낚싯대'})
 expect(screen.getAllByRole('heading',{level:2})).toHaveLength(fishingRods.length)
 fireEvent.click(screen.getByRole('button',{name:'청동 낚싯대 상세 보기'}))
 expect(screen.queryByRole('button',{name:/판매/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'400 구매'}))
 expect(transact).not.toHaveBeenCalled()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(transact).toHaveBeenCalledWith({type:'buy',id:'rod:bronze'}))
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 fireEvent.click(screen.getByRole('button',{name:'청동 낚싯대 상세 보기'}))
 fireEvent.click(screen.getByRole('button',{name:'200 판매'}))
 expect(within(screen.getByRole('alertdialog')).getByText('200')).toBeTruthy()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(transact).toHaveBeenCalledWith({type:'sell',id:'rod:bronze'}))
 expect(screen.queryByText(/임시 구매/)).toBeNull()
 expect(screen.queryByRole('button',{name:'입문용 낚싯대 반값 판매'})).toBeNull()
})
it('persists server equipment and renders it after returning to the fishing page',async()=>{
 server.owned.push('coral')
 render(<MemoryRouter><RodProvider><FishingRodShop/><FishingRodSelector regionId="coral"/></RodProvider></MemoryRouter>)
 await screen.findByRole('heading',{name:'산호꽃 낚싯대'})
 fireEvent.click(screen.getByRole('button',{name:'낚싯대 선택 · 입문용 낚싯대'}))
 const dialog=screen.getByRole('dialog',{name:'낚싯대 선택'})
 expect(within(dialog).queryByText(/효과는 아직 적용되지/)).toBeNull()
 expect(within(dialog).queryByRole('button',{name:'청동 낚싯대 선택'})).toBeNull()
 expect(within(dialog).getByText('주 서식지 개체를 만나기 쉬워져요.')).toBeTruthy()
 expect(within(dialog).getByRole('img',{name:'산호빛 여울'})).toBeTruthy()
 expect(within(dialog).queryByRole('button',{name:/효과 안내/})).toBeNull()
 fireEvent.click(within(dialog).getByRole('button',{name:'산호꽃 낚싯대 선택'}))
 expect(equip).not.toHaveBeenCalled()
 expect(within(dialog).getByRole('button',{name:'산호꽃 낚싯대 선택'}).getAttribute('aria-pressed')).toBe('true')
 fireEvent.click(within(dialog).getByRole('button',{name:'이 낚싯대 사용하기'}))
 await waitFor(()=>expect(equip).toHaveBeenCalledWith('coral'))
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'낚싯대 선택'})).toBeNull())
 cleanup()
 const fishing=render(<RodProvider><TensionFishingGame active={false} onCaught={vi.fn()} onCancel={vi.fn()}/></RodProvider>)
 await waitFor(()=>expect(fishing.container.querySelector('[data-equipped-reel="coral"]')).toBeTruthy())
})
it('shows only owned rods in the warehouse and the real bait quantities in its other tab',async()=>{
 render(<MemoryRouter><RodProvider><PlaceBanner pathname="/warehouse"/><WarehousePage/></RodProvider></MemoryRouter>)
 expect(screen.getByRole('heading',{name:'창고'})).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:/낚싯대/}))
 fireEvent.click(await screen.findByRole('button',{name:'입문용 낚싯대 상세 보기'}))
 expect(await screen.findByRole('dialog',{name:'입문용 낚싯대'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 expect(screen.queryByRole('button',{name:'청동 낚싯대 상세 보기'})).toBeNull()
 fireEvent.click(screen.getByRole('tab',{name:'미끼'}))
 expect(await screen.findByRole('button',{name:'퐁당 지렁이 상세 보기'})).toBeTruthy()
 expect(screen.getByText('×7')).toBeTruthy()
 expect(screen.queryByRole('textbox',{name:'창고 검색'})).toBeNull()
})
it('fails closed on inventory errors and leaves a failed transaction in the confirmation',async()=>{
 transact.mockRejectedValueOnce(new Error('골드가 부족해요.'))
 render(<RodProvider><FishingRodShop/></RodProvider>)
 fireEvent.click(await screen.findByRole('button',{name:'청동 낚싯대 상세 보기'}))
 fireEvent.click(screen.getByRole('button',{name:'400 구매'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'확인'}))
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','골드가 부족해요.')
 cleanup();load.mockRejectedValue(new Error('offline'))
 render(<RodProvider><FishingRodShop/></RodProvider>)
 expect(await screen.findByRole('alert')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'청동 낚싯대 구매'})).toBeNull()
})
