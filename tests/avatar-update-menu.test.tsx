import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MemoryRouter} from 'react-router'
import {AvatarMenu} from '@/features/profile/avatar-menu'
import {openPwaUpdateMenu,setPwaUpdateAvailable,usePwaUpdate} from '@/features/pwa/update-state'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'test-user'}}}),getNickname:()=> '퐁이'}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>({profile:null})}))
vi.mock('@/lib/client',()=>({createClient:()=>({auth:{signOut:vi.fn()}})}))
function State(){const update=usePwaUpdate();return <output aria-label="업데이트 요청">{update.request}</output>}
afterEach(()=>{cleanup();setPwaUpdateAvailable(false)})
it('opens the avatar dropdown from the update toast without applying the update',async()=>{
 setPwaUpdateAvailable(true)
 render(<MemoryRouter><AvatarMenu/><State/></MemoryRouter>)
 act(()=>openPwaUpdateMenu())
 expect(await screen.findByRole('menuitem',{name:'지금 업데이트'})).toBeTruthy()
 expect(screen.getByLabelText('업데이트 요청').textContent).toBe('0')
})
it('always shows a disabled update action without a new version',async()=>{
 render(<MemoryRouter><AvatarMenu/><State/></MemoryRouter>)
 fireEvent.click(screen.getByRole('button',{name:'내 계정 메뉴'}))
 const action=await screen.findByRole('menuitem',{name:'지금 업데이트'})
 expect(action.getAttribute('aria-disabled')).toBe('true')
 fireEvent.click(action)
 expect(screen.getByLabelText('업데이트 요청').textContent).toBe('0')
})
it('keeps the update indicator and manual action available after dismissing the menu',async()=>{
 setPwaUpdateAvailable(true)
 const view=render(<MemoryRouter><AvatarMenu/><State/></MemoryRouter>)
 const trigger=screen.getByRole('button',{name:'내 계정 메뉴, 새 업데이트 있음'})
 expect(trigger.querySelector('.motion-safe\\:animate-ping')).toBeTruthy()
 fireEvent.click(trigger)
 fireEvent.click(await screen.findByRole('menuitem',{name:'지금 업데이트'}))
 expect(screen.getByLabelText('업데이트 요청').textContent).toBe('1')
 expect(screen.getByRole('button',{name:'내 계정 메뉴, 새 업데이트 있음'})).toBeTruthy()
 act(()=>setPwaUpdateAvailable(false))
 expect(screen.getByRole('button',{name:'내 계정 메뉴'})).toBeTruthy()
 expect(view.container.querySelector('.motion-safe\\:animate-ping')).toBeNull()
})
