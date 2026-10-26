import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {HomePage} from '@/pages/home-page'
const mock=vi.hoisted(()=>({map:vi.fn(),catalog:vi.fn(),events:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'islander'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:mock.map,regionImageUrl:(path:string)=>'/regions/'+path}))
vi.mock('@/features/regions/harbor-catalog',()=>({loadHarborCatalog:mock.catalog}))
vi.mock('@/features/notices/api',async original=>({...await original<typeof import('@/features/notices/api')>(),loadNotices:mock.events}))
vi.mock('@/features/regions/harbor-mythic-showcase',async original=>({...await original<typeof import('@/features/regions/harbor-mythic-showcase')>(),HarborMythicShowcase:({items}:{items:{name:string;discovered:boolean}[]})=><div aria-label="신화 애니메이션" data-silhouette={items.every(item=>!item.discovered)}>{items.map(item=>item.name).join(',')}</div>}))
const old={id:'pongdang',name:'퐁당섬 앞바다',description:'첫 바다',sort_order:1,image_path:'pongdang.png',created_at:new Date(Date.now()-2*86400000).toISOString()}
const newest={id:'siren',name:'세이렌의 해협',description:'신비로운 노래가 흐르는 바다',sort_order:12,image_path:'siren.png',created_at:new Date(Date.now()-86400000).toISOString()}
const event={id:'festival',title:'가을 낚시 축제',body:'함께 **가을 바다**를 즐겨요.\n![이미지](poster.png)',category:'event',images:['poster.png'],urls:{'poster.png':'/poster.png'},starts_at:null,ends_at:null}
beforeEach(()=>{
 vi.clearAllMocks()
 mock.map.mockResolvedValue({regions:[old,newest]})
 mock.catalog.mockResolvedValue([{id:'siren-mythic',name:'해협의 수호자',rarity:'mythic',kind:'fish',is_native:true,native_region_id:'siren',discovered:false,habitats:[{id:'siren'}]}])
 mock.events.mockResolvedValue({items:[event],total:1})
})
afterEach(cleanup)
const show=()=>render(<MemoryRouter><HomePage/></MemoryRouter>)
it('shows four news tabs with supporters between species and events',async()=>{
 show()
 expect(screen.getAllByRole('tab').map(t=>t.textContent)).toEqual(['새로운 해역','신규 어종','주주명단','이벤트'])
 expect(await screen.findByRole('heading',{name:'세이렌의 해협'})).toBeTruthy()
 expect(screen.getByText(newest.description)).toBeTruthy()
 expect(screen.getByRole('img',{name:'세이렌의 해협 풍경'}).getAttribute('src')).toBe('/regions/siren.png')
 expect(screen.getByLabelText('신화 애니메이션').textContent).toBe('해협의 수호자')
 expect(screen.getByLabelText('신화 애니메이션').getAttribute('data-silhouette')).toBe('true')
 expect(screen.queryByText('자주 방문하는 곳을 정해두어요')).toBeNull()
 expect(mock.events).not.toHaveBeenCalled()
 fireEvent.keyDown(screen.getByRole('article'),{key:'ArrowRight'})
 expect(screen.getByRole('heading',{name:'퐁당섬 앞바다'})).toBeTruthy()
})
it('shows published event titles descriptions and posters and excludes ended events',async()=>{
 mock.events.mockResolvedValue({items:[event,{...event,id:'past',title:'지난 축제',ends_at:'2000-01-01T00:00:00Z'}],total:2})
 show();fireEvent.click(screen.getByRole('tab',{name:'이벤트'}))
 expect(await screen.findByRole('heading',{name:event.title})).toBeTruthy()
 expect(screen.getByText('함께 가을 바다를 즐겨요.')).toBeTruthy()
 expect(screen.getByRole('img',{name:'가을 낚시 축제 포스터'}).getAttribute('src')).toBe('/poster.png')
 expect(screen.queryByText('지난 축제')).toBeNull()
 expect(mock.events).toHaveBeenCalledWith('event','',0,false)
})
it('keeps the end of long event announcements readable',async()=>{
 const body='새로운 바다 친구들을 만나보세요. '.repeat(25)+'보상 수령은 일요일까지예요.'
 mock.events.mockResolvedValue({items:[{...event,body}],total:1})
 show();fireEvent.click(screen.getByRole('tab',{name:'이벤트'}))
 expect(await screen.findByText(body)).toBeTruthy()
})
it('lets the sea feed retry independently of the event tab',async()=>{
 mock.map.mockRejectedValueOnce(new Error('offline'))
 show();await screen.findByRole('alert')
 fireEvent.click(screen.getByRole('button',{name:'다시 불러오기'}))
 await waitFor(()=>expect(screen.getByRole('heading',{name:'세이렌의 해협'})).toBeTruthy())
 fireEvent.click(screen.getByRole('tab',{name:'이벤트'}))
 expect(await screen.findByRole('heading',{name:event.title})).toBeTruthy()
})

it('excludes seas outside seven days and swipes between current releases',async()=>{
 mock.map.mockResolvedValue({regions:[old,newest,{...old,id:'expired',name:'오래된 해역',created_at:new Date(Date.now()-8*86400000).toISOString()},{...old,id:'future',created_at:new Date(Date.now()+86400000).toISOString()}]})
 show();await screen.findByRole('heading',{name:newest.name})
 expect(screen.getByText('1/2')).toBeTruthy()
 expect(screen.queryByRole('group',{name:'새로운 해역 선택'})).toBeNull()
 const slide=screen.getByRole('article')
 fireEvent.touchStart(slide,{touches:[{clientX:250,clientY:100}]})
 fireEvent.touchEnd(slide,{changedTouches:[{clientX:100,clientY:110}]})
 expect(screen.getByRole('heading',{name:old.name})).toBeTruthy()
 expect(screen.getByText('2/2')).toBeTruthy()
 fireEvent.keyDown(screen.getByRole('article'),{key:'ArrowRight'})
 expect(screen.getByRole('heading',{name:newest.name})).toBeTruthy()
})
it('shows an empty state when no seas were registered in the last week',async()=>{
 mock.map.mockResolvedValue({regions:[{...old,created_at:new Date(Date.now()-8*86400000).toISOString()}]})
 show();expect(await screen.findByText('새로운 해역을 준비하고 있어요.')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'다음 해역'})).toBeNull()
})
