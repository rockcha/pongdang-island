import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MyIslandPage} from '@/features/my-island/my-island-coming-soon'
const access=vi.hoisted(()=>({operator:false,loading:false,mounted:vi.fn()}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>access}))
vi.mock('@/features/my-island/my-island-page',()=>({MyIslandPage:()=>{access.mounted();return <p>운영자 섬 편집기</p>}}))
beforeEach(()=>{access.operator=false;access.loading=false;vi.clearAllMocks()})
afterEach(cleanup)
const page=()=> <MemoryRouter><MyIslandPage/></MemoryRouter>
it('keeps the island closed to ordinary accounts',()=>{
 render(page())
 expect(screen.getByRole('heading',{name:'준비 중이에요'})).toBeTruthy()
 expect(access.mounted).not.toHaveBeenCalled()
})
it('does not mount the editor before operator permissions are known',()=>{
 access.loading=true
 render(page())
 expect(screen.getByRole('status')).toBeTruthy()
 expect(screen.queryByText('운영자 섬 편집기')).toBeNull()
 expect(access.mounted).not.toHaveBeenCalled()
})
it('opens the editor for an operator and closes it when access changes',async()=>{
 access.operator=true
 const view=render(page())
 expect(await screen.findByText('운영자 섬 편집기')).toBeTruthy()
 access.operator=false
 view.rerender(page())
 expect(screen.queryByText('운영자 섬 편집기')).toBeNull()
 expect(screen.getByRole('heading',{name:'준비 중이에요'})).toBeTruthy()
})
