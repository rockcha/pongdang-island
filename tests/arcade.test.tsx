import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ArcadePage, ArcadeGamePage } from '@/features/arcade/arcade-page'

import { PlaceBanner } from '@/components/place-banner'
vi.mock('@/features/gold/gold-provider', () => ({ GoldIcon: () => <span>골드</span> }))
afterEach(cleanup)
it('filters two-column cards by category and reward timing without descriptions',()=>{
 setup()
 expect(screen.getByText('즉시 보상')).toBeTruthy()
 expect(screen.getByRole('button',{name:'즉시 보상'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.queryByRole('link',{name:/그림자 맞추기/})).toBeNull()
 expect(screen.queryByText(/10골드로 시작해 홀짝을 맞히세요/)).toBeNull()
 expect(screen.getByRole('list').className).toContain('grid-cols-2')
 fireEvent.click(screen.getByRole('button',{name:/^피지컬/}))
 expect(screen.getByRole('link',{name:/벽돌깨기/})).toBeTruthy()
 expect(screen.queryByRole('link',{name:/카드 짝맞추기/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'전체 보기'}))
 fireEvent.click(screen.getByRole('button',{name:/^운빨/}))
 expect(screen.getByRole('link',{name:/퐁이의 홀짝 조개/})).toBeTruthy()
 expect(screen.queryByRole('link',{name:/그림자 맞추기/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:/^운빨/}))
 fireEvent.click(screen.getByRole('button',{name:'주간 보상'}))
 expect(screen.getByRole('link',{name:/그림자 맞추기/})).toBeTruthy()
 expect(screen.queryByRole('link',{name:/퐁이의 홀짝 조개/})).toBeNull()
})
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
