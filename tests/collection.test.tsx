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
const shared={...base,id:'shared',name:'공통 물고기',kind:'fish',rarity:'common',sell_price:30,habitats:[coral,moon]}
const native={...base,id:'native',name:'산호 물고기',kind:'fish',rarity:'rare',sell_price:150,habitats:[coral],is_native:false}
const decoration={...base,id:'decoration',name:'달빛 장식물',kind:'decoration',rarity:'rare',sell_price:180,habitats:[moon]}
const map={...base,id:'map',name:'지도 조각',kind:'map',rarity:'common',sell_price:0,habitats:[coral]}
async function open(add?:()=>void){
 load.mockResolvedValue({items:[],catalog:[decoration,native,shared,map]})
 render(<CollectionDialog onAddTemporary={add}/>)
 fireEvent.click(screen.getByRole('button',{name:'바다 도감'}))
 await screen.findByRole('article',{name:'공통 물고기'})
}
const cards=()=>within(screen.getByRole('list',{name:'도감 개체'})).queryAllByRole('article').map(card=>card.getAttribute('aria-label'))
it('shows descriptions, habitats and value inline with rarity backgrounds and no detail modal',async()=>{
 await open()
 expect(cards()).toEqual(['공통 물고기','산호 물고기','달빛 장식물'])
 expect(screen.queryByRole('button',{name:'지도'})).toBeNull()
 const card=screen.getByRole('article',{name:'산호 물고기'})
 expect(card.classList.contains('rarity-rare')).toBe(true)
 expect(within(card).getByText('작은 바다 친구의 이야기')).toBeTruthy()
 expect(within(card).getByText('서식지:')).toBeTruthy()
 expect(within(card).getByText('가치:')).toBeTruthy()
 expect(within(card).getByRole('group',{name:'서식지역: 산호빛 여울'})).toBeTruthy()
 expect(screen.queryByText(/미발견|발견 완료|보유/)).toBeNull()
 fireEvent.click(card)
 expect(screen.getAllByRole('dialog')).toHaveLength(1)
 expect(screen.queryByRole('button',{name:/상세 보기/})).toBeNull()
})
it('combines native habitat count, rarity, category and region toggles',async()=>{
 await open()
 fireEvent.change(screen.getByRole('combobox',{name:'도감 토착 여부'}),{target:{value:'native'}})
 expect(cards()).toEqual(['산호 물고기','달빛 장식물'])
 fireEvent.click(screen.getByRole('button',{name:'물고기'}))
 expect(cards()).toEqual(['산호 물고기'])
 fireEvent.click(screen.getByRole('button',{name:'안개달 해역 서식지역 필터'}))
 expect(screen.getByText('조건에 맞는 개체가 없어요.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'안개달 해역 서식지역 필터'}))
 fireEvent.change(screen.getByRole('combobox',{name:'도감 등급'}),{target:{value:'common'}})
 expect(cards()).toEqual([])
 fireEvent.change(screen.getByRole('combobox',{name:'도감 토착 여부'}),{target:{value:'shared'}})
 expect(cards()).toEqual(['공통 물고기'])
})
it('keeps repeated temporary insertion on cards and excludes maps',async()=>{
 const add=vi.fn()
 await open(add)
 const button=screen.getByRole('button',{name:'공통 물고기 임시 넣기'})
 fireEvent.click(button);fireEvent.click(button)
 expect(add).toHaveBeenCalledTimes(2)
 expect(add).toHaveBeenCalledWith(shared)
 expect(screen.getAllByRole('dialog')).toHaveLength(1)
 expect(screen.queryByRole('button',{name:'지도 조각 임시 넣기'})).toBeNull()
})

it('searches names, combines rarity filters, and clears without closing the book',async()=>{
 await open()
 fireEvent.change(screen.getByRole('searchbox',{name:'도감 개체 검색'}),{target:{value:'  물고기  '}})
 expect(cards()).toEqual(['공통 물고기','산호 물고기'])
 fireEvent.change(screen.getByRole('combobox',{name:'도감 등급'}),{target:{value:'rare'}})
 expect(cards()).toEqual(['산호 물고기'])
 fireEvent.change(screen.getByRole('searchbox',{name:'도감 개체 검색'}),{target:{value:'없는개체'}})
 expect(cards()).toEqual([])
 fireEvent.click(screen.getByRole('button',{name:'검색어 지우기'}))
 expect(cards()).toEqual(['산호 물고기','달빛 장식물'])
 expect(screen.getAllByRole('dialog')).toHaveLength(1)
})
