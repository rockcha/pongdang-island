import { act,cleanup,fireEvent,render,screen,within } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { NativeSpeciesCarousel } from '@/features/regions/native-species-carousel'
import { NativeSpeciesDialog } from '@/features/regions/native-species-dialog'
import type { CatalogEntry } from '@/features/collection/api'

const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/features/regions/harbor-catalog',()=>({loadHarborCatalog:load}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span role="img" aria-label={name}/>}))
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.resetAllMocks()})

const native={id:'native',name:'산호 물고기',description:'산호 바다의 친구',kind:'fish',rarity:'epic',thumbnail_path:'fish.png',is_native:true,native_region_id:'coral',discovered:true} as CatalogEntry

it('loops only when the row overflows and remeasures when the viewport widens',()=>{
 let width=100,measure=()=>{}
 vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(()=>width)
 vi.spyOn(HTMLElement.prototype,'scrollWidth','get').mockReturnValue(168)
 vi.stubGlobal('ResizeObserver',class{constructor(callback:()=>void){measure=callback}observe(){}disconnect(){}})
 const select=vi.fn()
 render(<NativeSpeciesCarousel items={[native,{...native,id:'second',name:'두 번째 친구'},{...native,id:'third',name:'세 번째 친구'}]} onSelect={select}/>)
 const row=screen.getByRole('group',{name:'이 바다의 특별한 개체 미리보기'})
 expect(row.dataset.looping).toBe('true')
 expect(row.querySelector('[aria-hidden="true"]')).toBeTruthy()
 expect(within(row).getAllByRole('button')).toHaveLength(3)
 fireEvent.click(screen.getByRole('button',{name:'산호 물고기 살펴보기'}))
 expect(select).toHaveBeenCalledWith(native)
 width=200
 act(()=>measure())
 expect(row.dataset.looping).toBe('false')
 expect(row.querySelector('[aria-hidden="true"]')).toBeNull()
})

it('loads only on opening and shows only this region’s native species without revealing undiscovered ones',async()=>{
 load.mockResolvedValue([native,{...native,id:'hidden',name:'비밀 물고기',description:'숨겨진 설명',discovered:false},{...native,id:'other',name:'다른 바다 친구',native_region_id:'pongdang'},{...native,id:'shared',name:'공통 친구',is_native:false}])
 render(<NativeSpeciesDialog regionId="coral" disabled={false}/>)
 expect(load).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'이 바다의 특별한 개체'}))
 expect(await screen.findByText('산호 물고기')).toBeTruthy()
 expect(screen.getAllByText('특급')).toHaveLength(2)
 expect(screen.getByText('아직 만나지 못한 친구')).toBeTruthy()
 for(const name of ['비밀 물고기','숨겨진 설명','다른 바다 친구','공통 친구'])expect(screen.queryByText(name)).toBeNull()
})

it('offers a retry after loading fails',async()=>{
 load.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([native])
 render(<NativeSpeciesDialog regionId="coral" disabled={false}/>)
 fireEvent.click(screen.getByRole('button',{name:'이 바다의 특별한 개체'}))
 fireEvent.click(await screen.findByRole('button',{name:'다시 불러오기'}))
 expect(await screen.findByText('산호 물고기')).toBeTruthy()
})
