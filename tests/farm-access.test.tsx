import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {FarmPage} from '@/pages/farm-page'
const access=vi.hoisted(()=>({operator:false,loading:false,mount:vi.fn()}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>access}))
vi.mock('@/features/farm/isometric-farm',()=>({IsometricFarmPage:()=>{access.mount(true);return <p>농장 편집 화면</p>}}))
afterEach(()=>{cleanup();access.mount.mockClear();access.operator=false;access.loading=false})
it('shows preparation to nonoperators without mounting or querying the farm editor',()=>{
 render(<MemoryRouter><FarmPage/></MemoryRouter>)
 expect(screen.getByRole('heading',{name:'준비 중이에요'})).toBeTruthy()
 expect(access.mount).not.toHaveBeenCalled()
})
it('waits for operator verification before mounting the editor',()=>{
 access.loading=true
 render(<MemoryRouter><FarmPage/></MemoryRouter>)
 expect(screen.getByRole('status')).toBeTruthy()
 expect(access.mount).not.toHaveBeenCalled()
})
it('opens the actual farm for an operator',async()=>{
 access.operator=true
 render(<MemoryRouter><FarmPage/></MemoryRouter>)
 expect(await screen.findByText('농장 편집 화면')).toBeTruthy()
 expect(access.mount).toHaveBeenCalledWith(true)
})
