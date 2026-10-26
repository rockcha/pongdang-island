import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {MemoryRouter,useLocation} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {HeaderPlaceNavigation,headerPlaces} from '@/components/header-place-navigation'
const mock=vi.hoisted(()=>({relic:null as {name:string;thumbnail_path:string}|null,newContent:{board:false,exchange:false,suggestions:false,bugs:false,showcase:false},status:null as 'sailing'|'returned'|null,harbor:null as {ready:number;total:number}|null,operator:false,savings:null as '미납'|'수령 가능'|null,fuel:null as {ready:number;total:number}|null,bait:null as {ready:number;total:number}|null}))
vi.mock('@/components/menu-activity',async original=>({...await original<typeof import('@/components/menu-activity')>(),useMenuActivity:()=>({
 ...(mock.fuel?{'/production':{...mock.fuel,running:1,unit:'곳'}}:{}),...(mock.bait?{'/bait-production':{...mock.bait,running:1,unit:'곳'}}:{}),...(mock.harbor?{'/port':{...mock.harbor,running:1,unit:'척'}}:{}),...(mock.status?{'/expeditions':{single:'유인',running:mock.status==='sailing'?1:0,ready:mock.status==='returned'?1:0,remaining:120000}}:{})
})}))
vi.mock('@/features/savings/use-savings-status',()=>({useSavingsStatus:()=>mock.savings}))
vi.mock('@/components/use-new-content',()=>({useNewContent:()=>mock.newContent}))
vi.mock('@/features/relics/use-equipped-relic',()=>({useEquippedRelic:()=>mock.relic}))
vi.mock('@/features/port/use-harbor-status',()=>({useHarborStatus:()=>mock.harbor}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:mock.operator,loading:false})}))
vi.mock('@/features/expeditions/use-expedition-status',()=>({useExpeditionStatus:()=>mock.status}))
vi.mock('@/features/production/use-production-menu-status',()=>({useProductionMenuStatus:(kind:string)=>kind==='fuel'?mock.fuel:mock.bait}))
beforeEach(()=>{mock.relic=null;mock.newContent={board:false,exchange:false,suggestions:false,bugs:false,showcase:false};mock.status=null;mock.harbor=null;mock.operator=false;mock.savings=null;mock.fuel=null;mock.bait=null})
afterEach(cleanup)
function View(){const {pathname}=useLocation();return <><HeaderPlaceNavigation/><output data-testid="path">{pathname}</output></>}
const groups=['내 섬','낚시','생산','장터','수집','소식','광장']
async function open(name:string){fireEvent.click(screen.getByRole('button',{name,exact:true}));return screen.findByRole('menu',{name:name+' 메뉴'})}
async function close(menu:HTMLElement){fireEvent.keyDown(menu,{key:'Escape'});await waitFor(()=>expect(screen.queryByRole('menu')).toBeNull())}
it('shows seven representative icons with visible labels and an active category',()=>{
 render(<MemoryRouter initialEntries={['/region/nyamnyam']}><View/></MemoryRouter>)
 const nav=screen.getByRole('navigation',{name:'장소 바로가기'}),buttons=within(nav).getAllByRole('button')
 expect(buttons.map(b=>b.getAttribute('aria-label'))).toEqual(groups)
 for(const button of buttons){expect(button.querySelector('svg')).toBeTruthy();expect(button.textContent).toBe(button.getAttribute('aria-label'))}
 expect(screen.getByRole('button',{name:'낚시'}).getAttribute('aria-current')).toBe('location')
})
it.each([
 ['내 섬',['/my-island','/aquarium','/profile','/decoration-shop','/music-room','/arcade']],
 ['낚시',['/harbor','/fishing','/expeditions','/port','/shop','/item-shop','/shipyard']],
 ['소식',['/island-news','/square/notices','/square/suggestions','/square/bugs']],
 ['생산',['/production','/bait-production','/my-bait-production','/farm','/production-shop','/bait-production-shop']],
 ['장터',['/exchange','/merchant-orders','/savings']],
 ['수집',['/storage','/warehouse','/collection','/titles','/relics']],
 ['광장',['/friends','/board','/showcase','/hall-of-fame','/development-fund','/square/sponsorship','/square/begging']],
])('keeps the correct destinations in %s',async(name,paths)=>{
 render(<MemoryRouter><View/></MemoryRouter>)
 const menu=await open(name as string)
 expect(within(menu).getAllByRole('menuitem').map(i=>i.getAttribute('href'))).toEqual(paths)
})
it('keeps every normal-player destination reachable in exactly one category',async()=>{
 render(<MemoryRouter><View/></MemoryRouter>);const paths:string[]=[]
 for(const group of groups){const menu=await open(group);paths.push(...within(menu).getAllByRole('menuitem').map(i=>i.getAttribute('href')!));await close(menu)}
 expect(new Set(paths).size).toBe(paths.length)
 expect(paths.sort()).toEqual(headerPlaces.filter(p=>p.to!=='/collection-animation').map(p=>p.to).sort())
})
it('navigates from each new category using the existing dropdown links',async()=>{
 render(<MemoryRouter><View/></MemoryRouter>)
 for(const [group,path] of [['수집','/relics'],['낚시','/port'],['장터','/savings'],['소식','/square/notices'],['내 섬','/profile']]){
  const menu=await open(group),item=within(menu).getAllByRole('menuitem').find(i=>i.getAttribute('href')===path)!
  fireEvent.click(item)
  await waitFor(()=>expect(screen.getByTestId('path').textContent).toBe(path))
  expect(screen.getByRole('button',{name:group}).getAttribute('aria-current')).toBe('location')
 }
})
it('preserves equipped relic artwork in the collection menu',async()=>{
 mock.relic={name:'조개 모래시계',thumbnail_path:'relics/rare/shell-hourglass_thumbnail.png'}
 render(<MemoryRouter><View/></MemoryRouter>)
 const menu=await open('수집')
 expect(within(menu).getByText('조개 모래시계')).toBeTruthy()
 expect(within(menu).getByRole('img',{name:'장착 중: 조개 모래시계'})).toBeTruthy()
})
it('preserves operator-only animation collection access',async()=>{
 const view=render(<MemoryRouter><View/></MemoryRouter>);let menu=await open('수집')
 expect(within(menu).queryByRole('menuitem',{name:/애니메이션 도감/})).toBeNull()
 mock.operator=true;view.rerender(<MemoryRouter><View/></MemoryRouter>);menu=screen.getByRole('menu')
 expect(within(menu).getByRole('menuitem',{name:/애니메이션 도감.*운영자/})).toBeTruthy()
})
it('routes production, harbor, savings and community activity dots to their new categories',()=>{
 mock.newContent.bugs=true;mock.newContent.exchange=true;mock.harbor={ready:1,total:2};mock.fuel={ready:1,total:3}
 const view=render(<MemoryRouter><View/></MemoryRouter>)
 for(const label of ['소식','장터','낚시','생산'])expect(screen.getByRole('button',{name:label}).querySelector('[data-category-activity]')).toBeTruthy()
 for(const label of ['내 섬','광장','수집'])expect(screen.getByRole('button',{name:label}).querySelector('[data-category-activity]')).toBeNull()
 mock.newContent.bugs=false;mock.newContent.exchange=false;mock.harbor=null;mock.fuel=null;view.rerender(<MemoryRouter><View/></MemoryRouter>)
 expect(document.querySelectorAll('[data-category-activity]')).toHaveLength(0)
 mock.savings='수령 가능';view.rerender(<MemoryRouter><View/></MemoryRouter>)
 expect(screen.getByRole('button',{name:'장터'}).querySelector('[data-category-activity]')).toBeTruthy()
})
it('keeps returned traps and ready boat counts inside the voyage menu',async()=>{
 mock.status='returned';mock.harbor={ready:1,total:2}
 render(<MemoryRouter><View/></MemoryRouter>);const menu=await open('낚시')
 expect(within(menu).getByRole('menuitem',{name:/어선 파견.*총 2척.*수령 1/})).toBeTruthy()
 expect(within(menu).queryByRole('menuitem',{name:/조선소.*수령 가능/})).toBeNull()
 await close(menu);const fishing=await open('낚시');expect(within(fishing).getByRole('menuitem',{name:/통발.*수령 가능/})).toBeTruthy()
})
