import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { CollectionPage } from '@/features/collection/collection-page'
const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span role="img" aria-label={name}/>}))
vi.mock('@/features/collection/api',()=>({loadCollection:load,kindLabels:{fish:'물고기',trash:'쓰레기',structure:'구조물',map:'지도'}}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('browses thumbnails by kind and opens the habitat and species description',async()=>{
 const common={description:'작은 바다 친구',size:72,speed:0.05,swim_y_min:0.2,swim_y_max:0.7,thumbnail_path:'fish/thumbnail.png',sell_price:40,habitats:[{id:'pongdang',name:'퐁당섬 앞바다'}],discovered:true}
 load.mockResolvedValue({items:[],catalog:[{...common,id:'pongul',name:'퐁울복',kind:'fish',rarity:'common'},{...common,id:'bottle',name:'잊힌 유리병',kind:'trash',rarity:null}]})
 render(<MemoryRouter><CollectionPage/></MemoryRouter>)
 await screen.findByRole('img',{name:'퐁울복'})
 fireEvent.click(screen.getByRole('button',{name:'쓰레기'}))
 expect(screen.queryByRole('img',{name:'퐁울복'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:/잊힌 유리병/}))
 const dialog=await screen.findByRole('dialog')
 expect(within(dialog).getByText('작은 바다 친구')).toBeTruthy()
 expect(within(dialog).getByText(/퐁당섬 앞바다/)).toBeTruthy()
})
