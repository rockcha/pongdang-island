import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
import { FishingPanel } from '@/features/fishing/fishing-panel'
vi.mock('@/features/fishing/fishing-presentation',async(importOriginal)=>({...await importOriginal<typeof import('@/features/fishing/fishing-presentation')>(),FISHING_ANIMATION_MS:0}))
const {load,cast,refresh,transact}=vi.hoisted(()=>({load:vi.fn(),cast:vi.fn(),refresh:vi.fn(),transact:vi.fn()}))
vi.mock('@/features/fishing/api',()=>({loadFishing:load,castFishing:cast,fishingError:()=> '결과를 다시 확인해주세요.'}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null,useGold:()=>({wallet:{gold:1000,inventory:{bait:2}},transact,refresh,busy:false,loading:false,error:''})}))
const bait={id:'bait',name:'퐁당 지렁이',description:'퐁당섬의 선홍빛 지렁이',effect_kind:'fish',effect_description:'기본 확률',price:30,image_path:'/normal.png',common_bp:3000,rare_bp:1000,epic_bp:100,mythic_bp:30,failure_bp:5870}
afterEach(()=>{cleanup();vi.clearAllMocks()})
function setup(){load.mockResolvedValue({baits:[bait],items:[]});refresh.mockResolvedValue(undefined);return render(<MemoryRouter><FishingPanel regionId="pongdang"/></MemoryRouter>)}
it('shows server-calculated region odds and the separate map chance',async()=>{
 load.mockResolvedValue({regionId:'mistmoon',regionName:'안개달 해역',mapChanceBp:500,baits:[{...bait,common_bp:3347,rare_bp:660,epic_bp:107,mythic_bp:16}]})
 render(<MemoryRouter><FishingPanel regionId="mistmoon"/></MemoryRouter>)
 expect(await screen.findByText('안개달 해역 기준')).toBeTruthy()
 expect(screen.getByText(/일반 33.47% · 희귀 6.6% · 특급 1.07% · 신화 0.16% · 실패 58.7%/)).toBeTruthy()
 expect(screen.getByText(/지도 조각을 5% 확률/)).toBeTruthy()
})
it('buys one bait and shows failure with inventory refresh',async()=>{
 cast.mockResolvedValue({attempt:{operation_id:'test',rarity:null},replayed:false})
 setup();await screen.findByText('퐁당 지렁이')
 fireEvent.click(screen.getByRole('button',{name:'퐁당 지렁이 1개 구매 30 골드'}))
 await waitFor(()=>expect(transact).toHaveBeenCalledWith({type:'buy',id:'fishing:bait'}))
 await waitFor(()=>expect((screen.getByRole('button',{name:'퐁당 지렁이 1개로 낚시하기'}) as HTMLButtonElement).disabled).toBe(false))
 fireEvent.click(screen.getByRole('button',{name:'퐁당 지렁이 1개로 낚시하기'}))
 await screen.findByText('낚시 실패')
 expect(cast).toHaveBeenCalledWith('pongdang','bait',expect.any(String))
 expect(refresh).toHaveBeenCalled()
})
it('reuses operation ID on transport retry',async()=>{
 cast.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({attempt:{operation_id:'test',rarity:'rare',species:{id:'sample',name:'달빛 퐁울복',kind:'fish',rarity:'rare',description:'푸른 바다의 친구',thumbnail_path:'fish/thumbnail.png'}},replayed:true})
 setup();await screen.findByText('퐁당 지렁이')
 fireEvent.click(screen.getByRole('button',{name:'퐁당 지렁이 1개로 낚시하기'}))
 const retry=await screen.findByRole('button',{name:'결과 다시 확인'})
 await waitFor(()=>expect((retry as HTMLButtonElement).disabled).toBe(false))
 fireEvent.click(retry)
 await screen.findByText('달빛 퐁울복 획득!')
 expect(cast.mock.calls[0][2]).toBe(cast.mock.calls[1][2])
})

it('shows acquisition-only baits and permits selecting decoration bait',async()=>{
 load.mockResolvedValue({baits:[bait,{...bait,id:'bait_epic',name:'별잠의 유혹',price:null,effect_description:'최소 특급 보장'},{...bait,id:'bait_magnet',name:'심해 인력석',price:null,effect_kind:'decoration',effect_description:'장식물 획득 보장 준비 중'}],items:[]})
 render(<MemoryRouter><FishingPanel regionId="pongdang"/></MemoryRouter> )
 await screen.findByText('별잠의 유혹')
 expect(screen.queryByRole('button',{name:/별잠의 유혹 1개 구매/})).toBeNull()
 expect(screen.getAllByText('획득 전용 · 획득처 준비 중')).toHaveLength(2)
 expect(screen.getAllByRole('button',{name:'선택'})).toHaveLength(2)
})
