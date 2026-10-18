import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {CollectionDialog} from '@/features/collection/collection-dialog'
const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span role="img" aria-label={name}/>}))
vi.mock('@/features/collection/api',()=>({loadCollection:load,kindLabels:{fish:'물고기',trash:'쓰레기',decoration:'장식물',map:'지도'}}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
const coral={id:'coral',name:'산호빛 여울'},moon={id:'mistmoon',name:'안개달 해역'}
const base={description:'작은 바다 친구의 이야기',size:52,speed:.05,thumbnail_path:'preview.png',discovered:false}
const shared={...base,id:'shared',discovered:true,name:'공통 물고기',kind:'fish',rarity:'common',sell_price:30,habitats:[coral,moon]}
const native={...base,id:'native',discovered:true,native_region_id:'coral',name:'산호 물고기',kind:'fish',rarity:'rare',sell_price:150,habitats:[coral],is_native:true}
const decoration={...base,id:'decoration',is_native:true,native_region_id:'mistmoon',name:'달빛 장식물',kind:'decoration',rarity:'rare',sell_price:180,habitats:[moon]}
const map={...base,id:'map',name:'지도 조각',kind:'map',rarity:'common',sell_price:0,habitats:[coral]}
async function open(add?:()=>void){
 load.mockResolvedValue({items:[],catalog:[decoration,native,shared,map]})
 render(<CollectionDialog onAddTemporary={add}/>)
 fireEvent.click(screen.getByRole('button',{name:'바다 도감'}))
 await screen.findByRole('article',{name:'공통 물고기'})
}
const cards=()=>within(screen.getByRole('list',{name:'도감 개체'})).queryAllByRole('article').map(card=>card.getAttribute('aria-label'))

async function choose(label:string, option:string){
 fireEvent.mouseDown(screen.getByRole('combobox',{name:label}))
 fireEvent.click(screen.getByRole('combobox',{name:label}))
 fireEvent.keyDown(await screen.findByRole('option',{name:option}),{key:'Enter'})
}
it('locks undiscovered cards, marks native species, and keeps filters after details close',async()=>{
 await open()
 expect(cards()).toEqual(['공통 물고기','산호 물고기','달빛 장식물'])
 expect(screen.queryByRole('button',{name:'지도'})).toBeNull()
 expect(screen.queryByText('작은 바다 친구의 이야기')).toBeNull()
 expect(screen.queryByRole('searchbox')).toBeNull()
 const locked=screen.getByRole('button',{name:'달빛 장식물 잠김'}) as HTMLButtonElement
 expect(locked.disabled).toBe(true)
 fireEvent.click(locked)
 expect(screen.getAllByRole('dialog')).toHaveLength(1)
 expect(screen.queryByText('미발견')).toBeNull()
 expect(screen.getByLabelText('산호빛 여울 주 서식지')).toBeTruthy()
 await choose('도감 등급','희귀')
 fireEvent.click(screen.getByRole('button',{name:'산호 물고기 상세 보기'}))
 expect(await screen.findByText('작은 바다 친구의 이야기')).toBeTruthy()
 fireEvent.click(screen.getAllByRole('button',{name:'Close'}).at(-1)!)
 expect(cards()).toEqual(['산호 물고기','달빛 장식물'])
})
it('replaces the selected habitat and combines it with category and rarity',async()=>{
 await open()
 await choose('도감 주 서식지','산호빛 여울')
 expect(cards()).toEqual(['산호 물고기'])
 await choose('도감 주 서식지','안개달 해역')
 expect(cards()).toEqual(['달빛 장식물'])
 fireEvent.click(screen.getByRole('button',{name:'물고기'}))
 expect(cards()).toEqual([])
 await choose('도감 등급','희귀')
 expect(cards()).toEqual([])
})
it('allows repeated temporary insertion from cards without opening details',async()=>{
 const add=vi.fn()
 await open(add)
 const button=await screen.findByRole('button',{name:'공통 물고기 임시 넣기'})
 fireEvent.click(button);fireEvent.click(button)
 expect(add).toHaveBeenCalledTimes(2)
 expect(add).toHaveBeenCalledWith(shared)
 expect(screen.getAllByRole('dialog')).toHaveLength(1)
 fireEvent.click(screen.getByRole('button',{name:'달빛 장식물 임시 넣기'}))
 expect(add).toHaveBeenLastCalledWith(decoration)
})
