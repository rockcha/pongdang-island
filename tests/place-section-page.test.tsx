import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it} from 'vitest'
import {PlaceSectionPage} from '../src/pages/place-section-page'
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
it('renders each child destination as its own preparation page with a district return link',()=>{
 for(const section of ['square','merchants'] as const)for(const item of placeSections[section].items.filter(item=>item.path!=='/shop')){
  const view=render(<MemoryRouter initialEntries={[item.path]}><PlaceSectionPage section={section}/></MemoryRouter>)
  expect(screen.getByRole('heading',{name:item.title})).toBeTruthy()
  expect(screen.getByRole('link',{name:placeSections[section].title}).getAttribute('href')).toBe(placeSections[section].path)
  expect(screen.getByText('준비 중이에요')).toBeTruthy()
  view.unmount()
 }
})
