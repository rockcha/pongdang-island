import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MemoryRouter,Routes,Route} from 'react-router'
import {ShopPage} from '@/features/gold/shop-page'
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({loading:false,error:null,refresh:vi.fn()})}))
vi.mock('@/features/gold/fuel-shop',()=>({FuelShop:()=> <p>연료 구매 화면</p>}))
vi.mock('@/features/fishing/bait-shop',()=>({BaitShop:()=> <p>미끼 구매 화면</p>}))
vi.mock('@/features/fishing/fishing-rod-ui',()=>({FishingRodShop:()=> <p>낚싯대 구매 화면</p>}))
vi.mock('@/features/regions/map-shop',()=>({MapShop:()=> <p>지도 구매 화면</p>}))
afterEach(cleanup)
it('keeps fishing supplies and item supplies on separate routes and redirects old map links',()=>{
 render(<MemoryRouter initialEntries={['/shop?tab=maps&region=coral']}><Routes><Route path="/shop" element={<ShopPage/>}/><Route path="/item-shop" element={<ShopPage items/>}/></Routes></MemoryRouter>)
 expect(screen.getByRole('tab',{name:'지도'}).getAttribute('aria-selected')).toBe('true')
 expect(screen.getByRole('tab',{name:'연료'})).toBeTruthy()
 expect(screen.queryByRole('tab',{name:'미끼'})).toBeNull()
 fireEvent.click(screen.getByRole('tab',{name:'연료'}))
 expect(screen.getByText('연료 구매 화면')).toBeTruthy()
})
it('shows only bait and rods in the fishing shop',()=>{
 render(<MemoryRouter initialEntries={['/shop']}><ShopPage/></MemoryRouter>)
 expect(screen.getByRole('tab',{name:'미끼'})).toBeTruthy()
 expect(screen.getByRole('tab',{name:'낚싯대'})).toBeTruthy()
 expect(screen.queryByRole('tab',{name:'연료'})).toBeNull()
 expect(screen.queryByRole('tab',{name:'지도'})).toBeNull()
})
