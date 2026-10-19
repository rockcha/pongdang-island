import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ArcadePage, ArcadeGamePage } from '@/features/arcade/arcade-page'

import { PlaceBanner } from '@/components/place-banner'
vi.mock('@/features/gold/gold-provider', () => ({ GoldIcon: () => <span>골드</span> }))
afterEach(cleanup)
it('identifies the active game with a breadcrumb without a poster in the banner',()=>{
 render(<MemoryRouter><PlaceBanner pathname="/arcade/memory"/></MemoryRouter>)
 expect(screen.getByRole('heading',{name:/오락실.*카드 짝맞추기/})).toBeTruthy()
 expect(screen.queryByRole('img',{name:'카드 짝맞추기 포스터'})).toBeNull()
 expect(screen.getByRole('link',{name:'오락실'}).getAttribute('href')).toBe('/arcade')
})
function Banner(){const {pathname}=useLocation();return <PlaceBanner pathname={pathname}/>}
function setup(path='/arcade') { render(<MemoryRouter initialEntries={[path]}><Banner/><Routes><Route path="/arcade" element={<ArcadePage />} /><Route path="/arcade/:gameId" element={<ArcadeGamePage />} /></Routes></MemoryRouter>) }
it('opens a listed game and returns to the lobby without charging admission', () => {
 setup()
 fireEvent.click(screen.getByRole('link', { name: /지하 탐험하기/ }))
 expect(screen.getByText('게임을 준비하고 있어요.')).toBeTruthy()
 expect(screen.getByText('참가비 미정')).toBeTruthy()
 fireEvent.click(screen.getByRole('link',{name:'목록으로'}))
 expect(screen.getByRole('region', { name: '오락실 게임 목록' })).toBeTruthy()
})
it('handles an unknown game with a route back to the lobby', () => {
 setup('/arcade/missing')
 expect(screen.getByText('게임을 찾을 수 없어요.')).toBeTruthy()
 expect(screen.getByRole('link',{name:'목록으로'}).getAttribute('href')).toBe('/arcade')
})
