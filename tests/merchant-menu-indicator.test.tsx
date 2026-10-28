import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,it,expect,vi} from 'vitest'
import {HeaderPlaceNavigation} from '@/components/header-place-navigation'
const status=vi.hoisted(()=>({ready:0,unread:true}))
vi.mock('@/components/menu-activity',async original=>({...await original<typeof import('@/components/menu-activity')>(),useMenuActivity:()=>({'/merchant-orders':{kind:'merchant',running:0,ready:status.ready}})}))
vi.mock('@/components/use-new-content',()=>({useNewContent:()=>({merchant:status.unread})}))
vi.mock('@/features/relics/use-equipped-relic',()=>({useEquippedRelic:()=>null}))
vi.mock('@/features/savings/use-savings-status',()=>({useSavingsStatus:()=>null}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>({operator:false})}))
beforeEach(()=>{status.ready=0;status.unread=true})
afterEach(cleanup)
async function open(){render(<MemoryRouter><HeaderPlaceNavigation/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'장터'}));return screen.findByRole('menu',{name:'장터 메뉴'})}
it('does not mark unread merchant orders NEW unless something can be delivered',async()=>{
 const menu=await open()
 expect(within(menu).queryByText('NEW')).toBeNull()
 expect(document.querySelector('[data-category-activity="장터"]')).toBeNull()
})
it('marks deliverable orders NEW after reading, and keeps the dot only on the outer category',async()=>{
 status.ready=2;status.unread=false
 const menu=await open(),item=within(menu).getByRole('menuitem',{name:/바다 상인의 의뢰/})
 expect(within(item).getByText('NEW')).toBeTruthy()
 expect(within(item).getByText('2건 바로 납품 가능')).toBeTruthy()
 expect(within(item).queryByRole('img',{name:'납품 가능한 의뢰 있음'})).toBeNull()
 const dot=document.querySelector('[data-category-activity="장터"]') as HTMLElement
 expect(dot).toBeTruthy();expect(dot.style.backgroundColor).toBe('')
 expect(menu.querySelector('.category-activity-dot')).toBeNull()
})
