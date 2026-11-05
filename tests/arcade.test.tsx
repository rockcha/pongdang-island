import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ArcadePage, ArcadeGamePage } from '@/features/arcade/arcade-page'

import { PlaceBanner } from '@/components/place-banner'
vi.mock('@/features/gold/gold-provider', () => ({ GoldIcon: () => <span>골드</span> }))
const access=vi.hoisted(()=>({operator:false,loading:false}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>access}))
vi.mock('@/features/arcade/tower-defense-game',()=>({default:()=> <p>디펜스 연습 화면</p>}))
vi.mock('@/features/exploration/exploration-page',()=>({ExplorationPage:()=> <p>탐험 화면</p>}))
afterEach(()=>{cleanup();access.operator=false;access.loading=false})
it('filters two-column cards by category and reward timing without descriptions',()=>{
 setup()
 expect(screen.getByRole('button',{name:'전체'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.getByRole('link',{name:/그림자 맞추기/})).toBeTruthy()
 expect(screen.getByRole('link',{name:/퐁이 잡기/}).textContent).toContain('주간 보상')
 expect(screen.getByRole('link',{name:/퐁이 잡기/}).textContent).toContain('즉시 보상')
 expect(screen.getByRole('link',{name:/벽돌깨기/}).textContent).toContain('즉시 보상')
 expect(screen.queryByText(/10골드로 시작해 홀짝을 맞히세요/)).toBeNull()
 expect(screen.getByRole('list').className).toContain('grid-cols-2')
 fireEvent.click(screen.getByRole('button',{name:/^피지컬/}))
 expect(screen.getByRole('link',{name:/벽돌깨기/})).toBeTruthy()
 expect(screen.getByRole('link',{name:/퐁이 잡기/})).toBeTruthy()
 expect(screen.queryByRole('link',{name:/카드 짝맞추기/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'전체보기'}))
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
it('lists hybrid rewards in both reward filters',()=>{
 setup()
 fireEvent.click(screen.getByRole('button',{name:'즉시 보상'}))
 expect(screen.getByRole('link',{name:/퐁이 잡기/})).toBeTruthy()
 expect(screen.queryByRole('link',{name:/그림자 맞추기/})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'주간 보상'}))
 expect(screen.getByRole('link',{name:/퐁이 잡기/})).toBeTruthy()
 expect(screen.getByRole('link',{name:/그림자 맞추기/})).toBeTruthy()
})
function Banner(){const {pathname}=useLocation();return <PlaceBanner pathname={pathname}/>}
it('shows local calculation practice under brain and settlement without promising rewards',()=>{
 setup()
 fireEvent.click(screen.getByRole('button',{name:'뇌지컬'}))
 fireEvent.click(screen.getByRole('button',{name:'주간 보상'}))
 const card=screen.getByRole('link',{name:/누가 더 많을까?/})
 expect(card.textContent).toContain('연습 전용')
 expect(card.textContent).not.toContain('주간 보상')
 expect(card.getAttribute('href')).toBe('/arcade/calculation')
})
function setup(path='/arcade') { render(<MemoryRouter initialEntries={[path]}><Banner/><Routes><Route path="/arcade" element={<ArcadePage />} /><Route path="/arcade/:gameId" element={<ArcadeGamePage />} /><Route path="/collection" element={<p>일반 도감</p>}/></Routes></MemoryRouter>) }
it('opens a coming-soon game and returns to the lobby without charging admission', () => {
 setup()
 fireEvent.click(screen.getByRole('link', { name: /퐁이의 타워디펜스/ }))
 expect(screen.getByText('게임을 준비하고 있어요.')).toBeTruthy()
 expect(screen.getByText('무료')).toBeTruthy()
 fireEvent.click(screen.getByRole('link',{name:'목록으로'}))
 expect(screen.getByRole('region', { name: '오락실 게임 목록' })).toBeTruthy()
})
it('handles an unknown game with a route back to the lobby', () => {
 setup('/arcade/missing')
 expect(screen.getByText('게임을 찾을 수 없어요.')).toBeTruthy()
 expect(screen.getByRole('link',{name:'목록으로'}).getAttribute('href')).toBe('/arcade')
})

it('lists tower defense but shows its coming-soon screen when opened',async()=>{
 setup()
 expect(screen.getByRole('link',{name:/퐁이의 타워디펜스/})).toBeTruthy()
 cleanup();setup('/arcade/tower-defense')
 expect(await screen.findByText('게임을 준비하고 있어요.')).toBeTruthy()
})
it('keeps tower defense coming soon while operator permission is pending',async()=>{
 access.loading=true;setup('/arcade/tower-defense')
 expect(await screen.findByText('게임을 준비하고 있어요.')).toBeTruthy()
})
it('also keeps tower defense coming soon for a verified operator',async()=>{
 access.operator=true;setup()
 fireEvent.click(screen.getByRole('link',{name:/퐁이의 타워디펜스/}))
 expect(await screen.findByText('게임을 준비하고 있어요.')).toBeTruthy()
})
it('places exploration in brain and instant rewards and opens its existing lobby',async()=>{
 setup()
 fireEvent.click(screen.getByRole('button',{name:'뇌지컬'}))
 fireEvent.click(screen.getByRole('button',{name:'즉시 보상'}))
 const game=screen.getByRole('link',{name:/지하 탐험하기/})
 expect(game.querySelector('img')?.getAttribute('src')).toBe('/arcade/exploration/thumbnail.webp')
 fireEvent.click(game)
 expect(await screen.findByText('탐험 화면')).toBeTruthy()
})
