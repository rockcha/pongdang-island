import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { CollectionDialog } from '@/features/collection/collection-dialog'
const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span role="img" aria-label={name}/>}))
vi.mock('@/features/collection/api',()=>({loadCollection:load,kindLabels:{fish:'물고기',trash:'쓰레기',decoration:'장식물',map:'지도'}}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('sorts by price and combines rarity with kind filters',async()=>{
 const base={description:'설명',size:52,speed:0,thumbnail_path:'preview.png',habitats:[],discovered:true}
 load.mockResolvedValue({items:[],catalog:[
  {...base,id:'expensive',name:'희귀 물고기',kind:'fish',rarity:'rare',sell_price:180},
  {...base,id:'decoration',name:'희귀 장식물',kind:'decoration',rarity:'rare',sell_price:150},
  {...base,id:'cheap',name:'일반 물고기',kind:'fish',rarity:'common',sell_price:30},
 ]})
 render(<CollectionDialog/> )
 fireEvent.click(screen.getByRole('button',{name:'바다 도감'}))
 await screen.findByRole('img',{name:'일반 물고기'})
 const names=()=>within(screen.getByRole('list',{name:'도감 개체'})).queryAllByRole('img').map(img=>img.getAttribute('aria-label'))
 expect(names()).toEqual(['일반 물고기','희귀 장식물','희귀 물고기'])
 fireEvent.change(screen.getByRole('combobox',{name:'도감 등급'}),{target:{value:'rare'}})
 expect(names()).toEqual(['희귀 장식물','희귀 물고기'])
 fireEvent.click(screen.getByRole('button',{name:'물고기'}))
 expect(names()).toEqual(['희귀 물고기'])
 fireEvent.change(screen.getByRole('combobox',{name:'도감 등급'}),{target:{value:'mythic'}})
 expect(names()).toEqual([])
 expect(screen.getByText('조건에 맞는 개체가 없어요.')).toBeTruthy()
 fireEvent.change(screen.getByRole('combobox',{name:'도감 등급'}),{target:{value:'all'}})
 expect(names()).toEqual(['일반 물고기','희귀 물고기'])
})
it('browses thumbnails by kind and opens the habitat and species description',async()=>{
 const common={description:'작은 바다 친구',size:72,speed:0.05,swim_y_min:0.2,swim_y_max:0.7,thumbnail_path:'fish/thumbnail.png',sell_price:40,habitats:[{id:'pongdang',name:'퐁당섬 앞바다'}],discovered:true}
 load.mockResolvedValue({items:[],catalog:[{...common,id:'pongul',name:'퐁울복',kind:'fish',rarity:'common'},{...common,id:'bottle',name:'잊힌 유리병',kind:'trash',rarity:null}]})
 render(<MemoryRouter><CollectionDialog/></MemoryRouter>)
 expect(load).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'바다 도감'}))
 await screen.findByRole('img',{name:'퐁울복'})
 fireEvent.click(screen.getByRole('button',{name:'쓰레기'}))
 expect(screen.queryByRole('img',{name:'퐁울복'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:/잊힌 유리병/}))
 const dialog=await screen.findByRole('dialog')
 expect(within(dialog).getByText('작은 바다 친구')).toBeTruthy()
 expect(within(dialog).getByText(/퐁당섬 앞바다/)).toBeTruthy()
})

it.each(['fish','trash','decoration'] as const)('adds an undiscovered %s repeatedly from the image without closing the book',async(kind)=>{
 const species={id:'preview',name:'미리보기',kind,description:'설명',size:52,speed:0,swim_y_min:null,swim_y_max:null,thumbnail_path:'preview.png',sprite_sheet_path:null,sell_price:35,rarity:'common',habitats:[{id:'mistmoon',name:'안개달 해역'}],discovered:false,is_native:true,native_region_id:'mistmoon'}
 load.mockResolvedValue({items:[],catalog:[species]})
 const add=vi.fn()
 render(<CollectionDialog onAddTemporary={add}/> )
 fireEvent.click(screen.getByRole('button',{name:'바다 도감'}))
 const insert=await screen.findByRole('button',{name:'미리보기 임시 넣기'})
 fireEvent.click(insert)
 fireEvent.click(insert)
 expect(add).toHaveBeenCalledTimes(2)
 expect(add).toHaveBeenLastCalledWith(species)
 expect(screen.getByRole('heading',{name:'바다 도감'})).toBeTruthy()
 fireEvent.click(within(screen.getByRole('list',{name:'도감 개체'})).getByRole('button',{name:'미리보기 상세 보기'}))
 expect(screen.getByText('임시 개체예요. 새로고침하면 사라져요.')).toBeTruthy()
 expect(screen.getByText('토착 개체 · 이 지역에서만 만날 수 있어요.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'미리보기 임시 넣기'}))
 expect(add).toHaveBeenCalledWith(species)
 expect(screen.getByRole('heading',{name:'미리보기'})).toBeTruthy()
 expect(add).toHaveBeenCalledTimes(3)
})

it('does not offer aquarium insertion for maps',async()=>{
 load.mockResolvedValue({items:[],catalog:[{id:'map',name:'지도 조각',kind:'map',description:'설명',size:52,sell_price:0,rarity:'common',habitats:[],discovered:true}]})
 render(<CollectionDialog onAddTemporary={vi.fn()}/> )
 fireEvent.click(screen.getByRole('button',{name:'바다 도감'}))
 fireEvent.click(await screen.findByRole('button',{name:/지도 조각/}))
 expect(screen.queryByRole('button',{name:'넣기'})).toBeNull()
})
