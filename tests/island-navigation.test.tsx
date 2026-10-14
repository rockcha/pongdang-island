import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IslandNavigation } from '@/components/island-navigation'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}}),getNickname:()=> '낚시꾼'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:null,unread:{friend:2,general:1}})}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=> <span>아바타</span>}))
afterEach(cleanup)
function Location() { return <p data-testid="location">{useLocation().pathname}</p> }
function setup() {render(<MemoryRouter initialEntries={['/aquarium']}><IslandNavigation /><Location /></MemoryRouter>)}
describe('island side navigation',()=>{
  it('opens a left drawer, marks the active page, and shows mailbox unread count',async()=>{
    setup();fireEvent.click(screen.getByRole('button',{name:'섬 메뉴 열기'}))
    const dialog=await screen.findByRole('dialog')
    expect(dialog.getAttribute('data-side')).toBe('left')
    expect(within(dialog).getByRole('link',{name:/아쿠아리움/}).getAttribute('aria-current')).toBe('page')
    expect(within(dialog).getByRole('link',{name:/파도 우편함/}).textContent).toContain('3')
    expect(within(dialog).getByRole('link',{name:/퐁당마을/})).toBeTruthy()
    expect(within(dialog).getByRole('link',{name:/마이페이지/})).toBeTruthy()
  })
  it('navigates and closes the drawer after a menu selection',async()=>{
    setup();fireEvent.click(screen.getByRole('button',{name:'섬 메뉴 열기'}))
    const dialog=await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('link',{name:/선착장/}))
    expect(screen.getByTestId('location').textContent).toBe('/harbor')
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
  })
})
