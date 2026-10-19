import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {HarborMythicShowcase,regionalMythics} from '@/features/regions/harbor-mythic-showcase'
import type {CatalogEntry} from '@/features/collection/api'
vi.mock('@/features/collection/collectible-preview',()=>({CollectiblePreview:({species}:{species:CatalogEntry})=><span data-testid="animated-preview">{species.id}</span>}))
const first={id:'native',name:'바다의 수호자',description:'파도를 지키는 친구예요.',kind:'fish',rarity:'mythic',is_native:true,native_region_id:'pongdang',discovered:false,habitats:[{id:'pongdang',name:'퐁당섬'}]} as CatalogEntry
const second={...first,id:'shared',name:'별빛 고래',discovered:true,is_native:false,native_region_id:null}
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
it('shows shared mythics in the starter sea and only local natives in other seas',()=>{
 const wrongSea={...first,id:'other',habitats:[{id:'coral',name:'산호빛'}]}
 const rare={...first,id:'rare',rarity:'rare'} as CatalogEntry
 expect(regionalMythics([second,wrongSea,rare,first],'pongdang').map(s=>s.id)).toEqual(['shared'])
 expect(regionalMythics([first],'coral')).toEqual([])
 const coralNative={...first,id:'coral-native',native_region_id:'coral',habitats:[{id:'coral',name:'산호빛'}]}
 const sharedElsewhere={...second,id:'shared-other',habitats:[{id:'coral',name:'산호빛'}]}
 expect(regionalMythics([coralNative,sharedElsewhere,second],'coral').map(s=>s.id)).toEqual(['coral-native'])
 expect(regionalMythics([sharedElsewhere],'pongdang')).toEqual([])
})
it('chooses one random creature and keeps it stable across rerenders without carousel controls',()=>{
 vi.spyOn(Math,'random').mockReturnValue(.9)
 const view=render(<HarborMythicShowcase items={[first,second]} regionName="퐁당섬"/>)
 expect(screen.getByRole('button',{name:'별빛 고래 소개 보기'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'바다의 수호자 소개 보기'})).toBeNull()
 expect(view.container.querySelector('[data-silhouette="false"]')).toBeTruthy()
 vi.spyOn(Math,'random').mockReturnValue(0)
 view.rerender(<HarborMythicShowcase items={[first,second]} regionName="퐁당섬"/>)
 expect(screen.getByRole('button',{name:'별빛 고래 소개 보기'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:/다음 신화|이전 신화|자동 재생|일시정지/})).toBeNull()
})
it('retains silhouettes and the selected creature introduction',async()=>{
 const {container}=render(<HarborMythicShowcase items={[first]} regionName="퐁당섬"/>)
 expect(container.querySelector('[data-silhouette="true"]')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'바다의 수호자 소개 보기'}))
 const dialog=await screen.findByRole('dialog')
 expect(within(dialog).getByRole('heading',{name:'바다의 수호자'})).toBeTruthy()
 expect(within(dialog).getByText(first.description)).toBeTruthy()
})
