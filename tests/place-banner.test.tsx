import {MemoryRouter} from 'react-router'
import type {ReactElement} from 'react'
import {merchantDestinations} from '@/lib/merchant-destinations'
import {squareDestinations} from '@/lib/square-destinations'
import { cleanup,fireEvent,render as baseRender,screen } from '@testing-library/react'
import { afterEach,expect,it } from 'vitest'
import { PlaceBanner,placeBanners } from '../src/components/place-banner'

const render=(ui:ReactElement)=>baseRender(ui,{wrapper:MemoryRouter})
afterEach(cleanup)
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
 for(const item of merchantDestinations){
  view.rerender(<PlaceBanner pathname={item.path}/>)
  expect(screen.getByRole('heading',{name:new RegExp(item.title)})).toBeTruthy()
  expect(screen.getByRole('link',{name:'상인거리'}).getAttribute('href')).toBe('/merchant-street')
  expect(screen.getByRole('img').getAttribute('src')).toBe('/banners/'+item.banner+'.png')
 }

})
it('switches the landscape and title with the current place and omits aquarium banners',()=>{
 const view=render(<PlaceBanner pathname="/"/>)
 for(const [pathname,banner] of Object.entries(placeBanners)){
  view.rerender(<PlaceBanner pathname={pathname}/>)
  expect(screen.getByRole('heading',{level:1,name:new RegExp(banner.title)})).toBeTruthy()
  expect(screen.getByRole('img').getAttribute('src')).toBe(`/banners/${banner.image}.png`)
 }
 view.rerender(<PlaceBanner pathname="/aquarium"/>)
 expect(view.container.childElementCount).toBe(0)
})
it('keeps the place title readable if an image fails, then loads the next place',()=>{
 const view=render(<PlaceBanner pathname="/"/>)
 fireEvent.error(screen.getByRole('img'))
 expect(screen.getByRole('heading',{name:'퐁당 섬'})).toBeTruthy()
 expect(screen.queryByRole('img')).toBeNull()
 view.rerender(<PlaceBanner pathname="/harbor"/>)
 expect(screen.getByRole('img').getAttribute('src')).toBe('/banners/harbor.png')
})
