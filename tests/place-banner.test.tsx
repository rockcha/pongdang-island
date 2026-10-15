import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it } from 'vitest'
import { PlaceBanner,placeBanners } from '../src/components/place-banner'

afterEach(cleanup)
it('shares each district banner across its child pages',()=>{
 const view=render(<PlaceBanner pathname="/square/notices"/>)
 for(const pathname of ['/square/notices','/square/suggestions','/square/bugs']){
  view.rerender(<PlaceBanner pathname={pathname}/>)
  expect(screen.getByRole('heading',{name:'광장'})).toBeTruthy()
  expect(screen.getByRole('img').getAttribute('src')).toBe('/banners/square.png')
 }
 for(const pathname of ['/merchant-street/exchange','/merchant-street/auctions']){
  view.rerender(<PlaceBanner pathname={pathname}/>)
  expect(screen.getByRole('heading',{name:'상인거리'})).toBeTruthy()
  expect(screen.getByRole('img').getAttribute('src')).toBe('/banners/merchant-street.png')
 }
})
it('switches the landscape and title with the current place and omits aquarium banners',()=>{
 const view=render(<PlaceBanner pathname="/"/>)
 for(const [pathname,banner] of Object.entries(placeBanners)){
  view.rerender(<PlaceBanner pathname={pathname}/>)
  expect(screen.getByRole('heading',{level:1,name:banner.title})).toBeTruthy()
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
