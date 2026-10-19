import {MemoryRouter} from 'react-router'
import type {ReactElement} from 'react'
import {squareDestinations} from '@/lib/square-destinations'
import { cleanup,fireEvent,render as baseRender,screen } from '@testing-library/react'
import { afterEach,expect,it } from 'vitest'
import { PlaceBanner,placeBanners } from '../src/components/place-banner'

const render=(ui:ReactElement)=>baseRender(ui,{wrapper:MemoryRouter})
afterEach(cleanup)
it('shows board introductions and a square list action inside the banner',()=>{
 const view=render(<PlaceBanner pathname="/square/suggestions"/>)
 expect(screen.getByText('더 좋은 섬을 위한 생각을 들려주세요.')).toBeTruthy()
 expect(screen.getByRole('link',{name:'목록으로'}).getAttribute('href')).toBe('/square')
 view.rerender(<PlaceBanner pathname="/square/bugs"/>)
 expect(screen.getByText('불편하거나 이상한 점을 알려주세요.')).toBeTruthy()
 expect(screen.getByRole('link',{name:'목록으로'}).getAttribute('href')).toBe('/square')
})
it('uses one illustrated list action across game and community detail banners',()=>{
 const view=render(<PlaceBanner pathname="/arcade/odd-even"/>)
 for(const [path,parent] of [['/arcade/odd-even','/arcade'],['/arcade/underground','/arcade'],['/square/notices/new','/square/notices'],['/square/suggestions/post','/square/suggestions'],['/square/bugs/post','/square/bugs']]){
  view.rerender(<PlaceBanner pathname={path}/>)
  const action=screen.getByRole('link',{name:'목록으로'})
  expect(action.getAttribute('href')).toBe(parent)
  expect(action.querySelector('img')?.getAttribute('src')).toBe('/app-icons/back-to-list.png')
 }
})
it('places the notice list link on its detail banner',()=>{
 render(<PlaceBanner pathname="/square/notices/notice"/>)
 expect(screen.getByRole('link',{name:'목록으로'}).getAttribute('href')).toBe('/square/notices')
})
it('gives fishing and item shops separate banner identities',()=>{
 const view=render(<PlaceBanner pathname="/shop"/>)
 expect(screen.getByRole('heading',{name:'낚시 상점'})).toBeTruthy()
 view.rerender(<PlaceBanner pathname="/item-shop"/>)
 expect(screen.getByRole('heading',{name:'아이템 상점'})).toBeTruthy()
 expect(screen.getByRole('img').getAttribute('src')).toBe('/banners/item-shop.png')
})
it('links to the port from the right side of the shipyard banner',()=>{
 render(<PlaceBanner pathname="/shipyard"/>)
 expect(screen.getByRole('link',{name:'항구로'}).getAttribute('href')).toBe('/port')
})
it('shows the subtitle and opens a separate practical guide',async()=>{
 render(<PlaceBanner pathname="/warehouse"/>)
 expect(screen.getByText(placeBanners['/warehouse'].subtitle)).toBeTruthy()
 expect(screen.queryByRole('img',{hidden:true,name:''})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'창고 안내'}))
 expect(await screen.findByRole('dialog')).toBeTruthy()
 expect(screen.getByText('보유한 미끼와 낚싯대를 확인해요.')).toBeTruthy()
})
it('uses dedicated district child banners and breadcrumbs, including nested notices',()=>{
 const view=render(<PlaceBanner pathname="/square/notices"/>)
 for(const item of squareDestinations){
  for(const pathname of [item.path,...(item.path==='/square/notices'?['/square/notices/new','/square/notices/test-id','/square/notices/test-id/edit']:[])]){
   view.rerender(<PlaceBanner pathname={pathname}/>)
   expect(screen.getByRole('heading',{name:new RegExp(`광장.*${item.bannerTitle}`)})).toBeTruthy()
   expect(screen.getByRole('link',{name:'광장'}).getAttribute('href')).toBe('/square')
   expect(screen.getByRole('img').getAttribute('src')).toBe(`/banners/${item.banner}.png`)
  }
 }


})
it('switches the landscape and title with the current place, without an aquarium banner',()=>{
 const view=render(<PlaceBanner pathname="/"/>)
 for(const [pathname,banner] of Object.entries(placeBanners)){
  view.rerender(<PlaceBanner pathname={pathname}/>)
  expect(screen.getByRole('heading',{level:1,name:new RegExp(banner.title)})).toBeTruthy()
  expect(screen.getByRole('img').getAttribute('src')).toBe(`/banners/${banner.image}.png`)
 }
 view.rerender(<PlaceBanner pathname="/aquarium"/>)
 expect(screen.queryByRole('img')).toBeNull()
 expect(screen.queryByRole('heading')).toBeNull()
})
it('keeps the place title readable if an image fails, then loads the next place',()=>{
 const view=render(<PlaceBanner pathname="/"/>)
 fireEvent.error(screen.getByRole('img'))
 expect(screen.getByRole('heading',{name:'퐁당 섬'})).toBeTruthy()
 expect(screen.getByRole('img').getAttribute('src')).toBe('/fallback-image.svg')
 view.rerender(<PlaceBanner pathname="/harbor"/>)
 expect(screen.getByRole('img').getAttribute('src')).toBe('/banners/harbor.png')
})
