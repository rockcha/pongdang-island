import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {waitFor} from '@testing-library/react'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {FarmPage} from '@/pages/farm-page'
const access=vi.hoisted(()=>({session:{user:{id:'ordinary-player'}},mount:vi.fn(),friends:vi.fn(),farm:vi.fn(),suspended:false,pending:new Promise(()=>{})}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>access}))
vi.mock('@/features/farm/friend-directory-api',()=>({readFarmFriends:access.friends}))
vi.mock('@/features/farm/account-api',()=>({readAccountFarm:access.farm}))
vi.mock('@/features/farm/farm-friends',()=>({FarmWithFriends:()=>{if(access.suspended)throw access.pending;access.mount(true);return <p>농장 편집 화면</p>}}))
beforeEach(()=>{setQueryAccount(access.session.user.id);access.suspended=false;access.friends.mockResolvedValue({friends:[]});access.farm.mockResolvedValue({})})
afterEach(()=>{cleanup();setQueryAccount(null);appQueryClient.clear();vi.clearAllMocks()})
it('opens the actual account farm for a normal authenticated player without operator verification',async()=>{
 render(<MemoryRouter><FarmPage/></MemoryRouter>)
 expect(await screen.findByText('농장 편집 화면')).toBeTruthy()
 expect(access.mount).toHaveBeenCalledWith(true)
})
it('starts directory and own farm reads while the editor is still suspended',async()=>{
 access.suspended=true
 render(<MemoryRouter><FarmPage/></MemoryRouter>)
 await waitFor(()=>{expect(access.friends).toHaveBeenCalledTimes(1);expect(access.farm).toHaveBeenCalledTimes(1)})
 expect(access.mount).not.toHaveBeenCalled()
 expect(access.friends.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
})
it('does not initialize the own farm when opening a friend visit directly',async()=>{
 render(<MemoryRouter initialEntries={['/farm?visit=another-player']}><FarmPage/></MemoryRouter>)
 await waitFor(()=>expect(access.friends).toHaveBeenCalledTimes(1))
 expect(access.farm).not.toHaveBeenCalled()
})
