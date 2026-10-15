import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IslandNavigation } from '@/components/island-navigation'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}}),getNickname:()=> '낚시꾼'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:null,unread:{friend:2,general:1}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <span>아바타</span>}))
afterEach(()=>{cleanup();localStorage.clear()})
function Location() { return <p data-testid="location">{useLocation().pathname}</p> }
function setup() {render(<MemoryRouter initialEntries={['/aquarium']}><IslandNavigation /><Location /></MemoryRouter>)}
describe('island side navigation',()=>{
  it('opens a left drawer, marks the active page, and shows mailbox unread count',async()=>{
    setup();fireEvent.click(screen.getByRole('button',{name:'섬 메뉴 열기'}))
    const dialog=await screen.findByRole('dialog')
    expect(dialog.getAttribute('data-side')).toBe('left')
    expect(within(dialog).getByRole('link',{name:/아쿠아리움/}).getAttribute('aria-current')).toBe('page')
    expect(within(dialog).getByRole('link',{name:/우편함/}).textContent).toContain('3')
    expect(within(dialog).getByRole('link',{name:/퐁당 섬/})).toBeTruthy()
    expect(within(dialog).getByRole('link',{name:/마이페이지/})).toBeTruthy()
  })
  it('navigates and closes the drawer after a menu selection',async()=>{
    setup();fireEvent.click(screen.getByRole('button',{name:'섬 메뉴 열기'}))
    const dialog=await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('link',{name:/선착장/}))
    expect(screen.getByTestId('location').textContent).toBe('/harbor')
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('groups community and trading destinations into nested menus and highlights only the active child',async()=>{
    setup();fireEvent.click(screen.getByRole('button',{name:'섬 메뉴 열기'}))
    const dialog=await screen.findByRole('dialog')
    const square=within(dialog).getByRole('list',{name:'광장 하위 메뉴'})
    expect(within(square).getAllByRole('link').map(link=>link.textContent)).toEqual(['공지사항','건의함','버그 제보'])
    const merchants=within(dialog).getByRole('list',{name:'상인거리 하위 메뉴'})
    expect(within(merchants).getAllByRole('link').map(link=>link.textContent)).toEqual(['상점','거래소','경매소'])
    fireEvent.click(within(square).getByRole('link',{name:'건의함'}))
    expect(screen.getByTestId('location').textContent).toBe('/square/suggestions')
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button',{name:'섬 메뉴 열기'}))
    const reopened=await screen.findByRole('dialog')
    expect(within(reopened).getByRole('link',{name:'건의함'}).getAttribute('aria-current')).toBe('page')
    expect(within(reopened).getByRole('link',{name:'공지사항'}).getAttribute('aria-current')).toBeNull()
  })
})

it('persists collapsed sections across mounts without navigating',async()=>{
 setup();fireEvent.click(screen.getByRole('button',{name:'섬 메뉴 열기'}))
 fireEvent.click(await screen.findByRole('button',{name:'광장 접기'}))
 expect(screen.queryByRole('list',{name:'광장 하위 메뉴'})).toBeNull()
 expect(screen.getByTestId('location').textContent).toBe('/aquarium')
 cleanup();setup();fireEvent.click(screen.getByRole('button',{name:'섬 메뉴 열기'}))
 const expand=await screen.findByRole('button',{name:'광장 펼치기'})
 expect(expand.getAttribute('aria-expanded')).toBe('false')
 fireEvent.click(expand)
 expect(screen.getByRole('list',{name:'광장 하위 메뉴'})).toBeTruthy()
})
