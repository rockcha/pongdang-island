import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it} from 'vitest'
import {PlaceSectionPage} from '../src/pages/place-section-page'
import {PlaceBanner} from '@/components/place-banner'
import {squareDestinations} from '@/lib/square-destinations'
import {placeSections} from '../src/lib/place-sections'
afterEach(cleanup)
it('provides real links to every district destination',()=>{
 for(const section of ['square','merchants'] as const){
  const place=placeSections[section]
  const view=render(<MemoryRouter initialEntries={[place.path]}><PlaceSectionPage section={section}/></MemoryRouter>)
  for(const item of place.items)expect(screen.getByRole('link',{name:new RegExp(item.title)}).getAttribute('href')).toBe(item.path)
  view.unmount()
 }
})
it('shows square thumbnails and keeps unfinished child pages beneath the banner',()=>{
 const entrance=render(<MemoryRouter initialEntries={['/square']}><PlaceSectionPage section="square"/></MemoryRouter>)
 for(const item of squareDestinations){const link=screen.getByRole('link',{name:new RegExp(item.title)});expect(link.closest('li')?.querySelector('img')?.getAttribute('src')).toBe(`/square/${item.thumbnail}.png`)}
 entrance.unmount()
 for(const item of squareDestinations.filter(item=>item.upcoming)){
  const view=render(<MemoryRouter initialEntries={[item.path]}><PlaceBanner pathname={item.path}/><PlaceSectionPage section="square"/></MemoryRouter>)
  expect(screen.getByRole('heading',{level:1,name:new RegExp(item.title)})).toBeTruthy()
  expect(screen.queryByRole('heading',{level:2})).toBeNull()
  expect(screen.getByRole('link',{name:'광장'}).getAttribute('href')).toBe('/square')
  expect(screen.getByText('준비 중이에요')).toBeTruthy()
  view.unmount()
 }
})
