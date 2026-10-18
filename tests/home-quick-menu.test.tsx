import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it } from 'vitest'
import { HomePage } from '@/pages/home-page'

afterEach(()=>{cleanup();localStorage.clear()})
it('customizes four unique shortcuts, swaps duplicates and restores them on reopening',()=>{
 const page=render(<MemoryRouter><HomePage/></MemoryRouter>)
 expect(screen.getAllByRole('link')).toHaveLength(4)
 fireEvent.click(screen.getByRole('button',{name:'편집'}))
 fireEvent.click(screen.getByRole('button',{name:'1번 빠른 메뉴 변경: 아쿠아리움'}))
 fireEvent.click(screen.getByRole('button',{name:'지도',exact:true}))
 expect(screen.getByRole('button',{name:'1번 빠른 메뉴 변경: 지도'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'2번 빠른 메뉴 변경: 아쿠아리움'})).toBeTruthy()
 page.unmount()
 render(<MemoryRouter><HomePage/></MemoryRouter>)
 expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('/harbor')
})
it('uses defaults when the saved menu contains an unknown route',()=>{
 localStorage.setItem('pongdang:quick-menu',JSON.stringify(['/bad','/harbor','/shop','/friends']))
 render(<MemoryRouter><HomePage/></MemoryRouter>)
 expect(screen.getAllByRole('link')).toHaveLength(4)
 expect(screen.getByRole('link',{name:'아쿠아리움'}).getAttribute('href')).toBe('/aquarium')
})
