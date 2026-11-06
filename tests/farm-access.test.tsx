import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {FarmPage} from '@/pages/farm-page'
const access=vi.hoisted(()=>({session:{user:{id:'ordinary-player'}},mount:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>access}))
vi.mock('@/features/farm/account-farm',()=>({AccountFarm:()=>{access.mount(true);return <p>농장 편집 화면</p>}}))
afterEach(()=>{cleanup();access.mount.mockClear()})
it('opens the actual account farm for a normal authenticated player without operator verification',async()=>{
 render(<MemoryRouter><FarmPage/></MemoryRouter>)
 expect(await screen.findByText('농장 편집 화면')).toBeTruthy()
 expect(access.mount).toHaveBeenCalledWith(true)
})
