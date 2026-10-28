import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router'
import {MapShop} from '../src/features/regions/map-shop'
import {optimizedThumbnailUrl} from '../src/features/collection/thumbnail-art'

const path='map/rare/map-mukhyang_thumbnail.png'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/originals/'+path}))
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null,useGold:()=>({wallet:{gold:10000},transact:vi.fn(),loading:false,busy:false,error:''})}))
vi.mock('@/features/regions/map-shop-api',()=>({loadMapShop:async()=>({items:[{region_id:'mukhyang',name:'묵향 지도',description:'지도',price:500,thumbnail_path:'map/rare/map-mukhyang_thumbnail.png',owned:false}]})}))
afterEach(cleanup)

it('loads display-size map art and uses the original only if the derivative fails',async()=>{
 render(<MemoryRouter><MapShop/></MemoryRouter>)
 const card=await screen.findByRole('article',{name:'묵향 지도'})
 const image=within(card).getByRole('img',{name:'묵향 지도'})
 expect(image.getAttribute('src')).toBe(optimizedThumbnailUrl(path))
 expect(image.getAttribute('loading')).toBe('lazy')
 fireEvent.error(image)
 expect(within(card).getByRole('img',{name:'묵향 지도'}).getAttribute('src')).toBe('/originals/'+path)
 fireEvent.click(screen.getByRole('button',{name:'묵향 지도 상세 보기'}))
 const detail=within(screen.getByRole('dialog')).getByRole('img',{name:'묵향 지도'})
 expect(detail.getAttribute('src')).toBe(optimizedThumbnailUrl(path,'large'))
})
