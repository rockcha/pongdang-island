import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MemoryRouter,Route,Routes} from 'react-router'
import {FriendAquariumPage} from '@/features/friends/friend-aquarium-page'
vi.mock('@/features/friends/aquarium-api',()=>({loadFriendAquarium:async()=>({owner:{id:'friend',nickname:'친구퐁이',avatar_path:null},tanks:[{id:'one',name:'첫 어항',background_id:'default'},{id:'two',name:'두 번째 어항',background_id:'default'}],inhabitants:[],backgrounds:[]}),visitError:()=> '오류'}))
vi.mock('@/features/aquarium/tank-inhabitants',()=>({TankInhabitants:()=> <div data-testid="inhabitants"/>}))
vi.mock('@/features/friends/aquarium-care',()=>({AquariumCare:({tank}:{tank:string})=> <div>돌보기 {tank}</div>}))
afterEach(cleanup)
it('places owner inside the edge-to-edge tank, list at top right, and browses friend tanks read-only',async()=>{
 render(<MemoryRouter initialEntries={['/friends/friend/aquarium']}><Routes><Route path="/friends/:ownerId/aquarium" element={<FriendAquariumPage/>}/></Routes></MemoryRouter>)
 const nickname=await screen.findByText('친구퐁이')
 const tank=screen.getByLabelText('첫 어항')
 expect(tank.contains(nickname)).toBe(true);expect(tank.className).toContain('w-full');expect(tank.className).toContain('flex-1');expect(tank.className).toContain('min-h-0')
 expect(screen.getByRole('link',{name:/친구 목록/}).parentElement?.className).toContain('h-12')
 expect(nickname.parentElement?.parentElement?.className).toContain('left-3')
 fireEvent.click(screen.getByRole('button',{name:'다음 어항'}));expect(screen.getByLabelText('두 번째 어항')).toBeTruthy();expect(screen.getByText('돌보기 two')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'이전 어항'}))
 const list=within(tank).getByRole('button',{name:'개체 목록'});expect(list.className).toContain('right-3')
 fireEvent.click(list);expect(await screen.findByRole('dialog')).toBeTruthy();expect(screen.queryByRole('button',{name:/판매|보관|꾸미기/})).toBeNull()
})
