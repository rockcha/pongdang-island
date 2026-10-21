import {cleanup,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter,Route,Routes,useLocation} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FishingShortcutPage} from '@/features/regions/fishing-shortcut-page'
import {rememberRegion} from '@/features/regions/remembered-region'
const mock=vi.hoisted(()=>({map:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:mock.map}))
beforeEach(()=>{localStorage.clear();mock.map.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'pongdang',unlocked:true},{id:'bluegrove',unlocked:true}]})})
afterEach(cleanup)
function Destination(){return <output>{useLocation().pathname}</output>}
function setup(){render(<MemoryRouter initialEntries={['/fishing']}><Routes><Route path="/fishing" element={<FishingShortcutPage/>}/><Route path="*" element={<Destination/>}/></Routes></MemoryRouter>)}
it('opens the selected map through sailing when travel is needed',async()=>{
 rememberRegion('bluegrove','me');setup()
 await screen.findByText('/sailing/bluegrove')
})
it('opens the current fishing page when no map selection is saved',async()=>{
 mock.map.mockResolvedValue({currentRegion:'bluegrove',regions:[{id:'pongdang',unlocked:true},{id:'bluegrove',unlocked:true}]})
 setup();await screen.findByText('/region/bluegrove')
})
it('ignores another account selection and a locked saved map',async()=>{
 rememberRegion('bluegrove','other');rememberRegion('bluegrove','me')
 mock.map.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'pongdang',unlocked:true},{id:'bluegrove',unlocked:false}]})
 setup();await screen.findByText('/region/pongdang')
})
it('keeps a failed lookup on a retry screen',async()=>{
 mock.map.mockRejectedValueOnce(new Error('offline'));setup()
 await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('불러오지 못했어요'))
 expect(screen.getByRole('button',{name:'다시 시도'})).toBeTruthy()
})
