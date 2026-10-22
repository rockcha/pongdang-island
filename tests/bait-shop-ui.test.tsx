import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {BaitShop} from '@/features/fishing/bait-shop'
import {BaitTarget} from '@/features/fishing/bait-info'
import type {FishingBait} from '@/features/fishing/api'
const mock=vi.hoisted(()=>({transact:vi.fn().mockResolvedValue(undefined),load:vi.fn()}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null,useGold:()=>({wallet:{gold:1000,inventory:{}},transact:mock.transact,batchEffects:async(work:()=>Promise<void>)=>work(),loading:false,busy:false,error:''})}))
vi.mock('@/features/fishing/api',()=>({loadFishing:mock.load}))
beforeEach(()=>mock.load.mockResolvedValue({baits:[{id:'bait',name:'테스트 미끼',description:'미끼',image_path:'/bait.png',price:10,effect_description:'효과'}]}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('shows decorations alongside fish and trash for a universal bait without a server target field',()=>{
 render(<BaitTarget bait={{id:'bait',effect_kind:'fish'} as FishingBait}/>)
 expect(screen.getByLabelText('포획 대상').textContent).toBe('물고기쓰레기장식물')
})
it('lets users erase one and type thirty without restoring one mid-edit',async()=>{
 render(<BaitShop/>);fireEvent.click(await screen.findByRole('button',{name:'테스트 미끼 상세 보기'}))
 const input=screen.getByRole('spinbutton',{name:'구매 수량'}) as HTMLInputElement
 fireEvent.change(input,{target:{value:''}});expect(input.value).toBe('')
 expect(screen.getByRole('button',{name:'테스트 미끼 0개 구매'})).toHaveProperty('disabled',true)
 fireEvent.change(input,{target:{value:'30'}});expect(input.value).toBe('30')
 fireEvent.click(screen.getByRole('button',{name:'테스트 미끼 30개 구매'}))
 await waitFor(()=>expect(mock.transact).toHaveBeenCalledTimes(30))
})
it('restores the minimum only when an empty field loses focus',async()=>{
 render(<BaitShop/>);fireEvent.click(await screen.findByRole('button',{name:'테스트 미끼 상세 보기'}))
 const input=screen.getByRole('spinbutton',{name:'구매 수량'}) as HTMLInputElement
 fireEvent.change(input,{target:{value:''}});fireEvent.blur(input);expect(input.value).toBe('1')
})

it('combines search, target and waiting filters and resets an empty result before purchase',async()=>{
 const base={mechanicsVersion:2,description:'바다의 향기',image_path:'/bait.png',price:10,effect_description:'효과',common_bp:10000,rare_bp:0,epic_bp:0,mythic_bp:0}
 mock.load.mockResolvedValue({baits:[
  {...base,id:'bait',name:'파도 미끼',target_kinds:['fish','trash']},
  {...base,id:'bait_grubby_magnet',name:'꼬질 자석',target_kinds:['trash']},
  {...base,id:'bait_safe',name:'이슬 미끼',target_kinds:['fish']},
 ]})
 render(<BaitShop/>)
 await screen.findByRole('button',{name:'꼬질 자석 상세 보기'})
 fireEvent.click(screen.getByRole('combobox',{name:'미끼 포획 대상'}))
 fireEvent.keyDown(await screen.findByRole('option',{name:'쓰레기'}),{key:'Enter'})
 await waitFor(()=>expect(screen.queryByRole('listbox')).toBeNull())
 expect(screen.queryByRole('button',{name:'이슬 미끼 상세 보기'})).toBeNull()
 expect(screen.getByRole('button',{name:'파도 미끼 상세 보기'})).toBeTruthy()
 fireEvent.change(screen.getByRole('searchbox',{name:'미끼 검색'}),{target:{value:'  꼬질 '}})
 expect(screen.queryByRole('button',{name:'파도 미끼 상세 보기'})).toBeNull()
 fireEvent.click(screen.getByRole('combobox',{name:'미끼 대기시간'}))
 fireEvent.keyDown(await screen.findByRole('option',{name:'낮음',exact:true}),{key:'Enter'})
 await waitFor(()=>expect(screen.queryByRole('listbox')).toBeNull())
 expect(screen.getByText('조건에 맞는 미끼가 없어요.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'검색·필터 초기화'}))
 expect(screen.getByRole('searchbox',{name:'미끼 검색'})).toHaveProperty('value','')
 fireEvent.click(screen.getByRole('button',{name:'꼬질 자석 상세 보기'}))
 expect(screen.getByLabelText('포획 대상').textContent).toBe('쓰레기')
 expect(within(screen.getByRole('dialog')).getByText('보통')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'꼬질 자석 1개 구매'}))
 await waitFor(()=>expect(mock.transact).toHaveBeenCalledWith({type:'buy',id:'fishing:bait_grubby_magnet',name:'꼬질 자석'}))
})
