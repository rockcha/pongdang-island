import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter,Routes,Route} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {OperatorGuard} from '@/components/operator-guard'
const mock=vi.hoisted(()=>({operator:false,loading:false}))
vi.mock('@/features/notices/use-operator',()=>({useOperator:()=>mock}))
afterEach(cleanup)
function show(){render(<MemoryRouter initialEntries={['/collection-animation']}><Routes><Route path="/collection-animation" element={<OperatorGuard><p>애니메이션 미리보기</p></OperatorGuard>}/><Route path="/collection" element={<p>일반 도감</p>}/></Routes></MemoryRouter>)}
it('blocks direct animation-preview routes for nonoperators',()=>{mock.operator=false;mock.loading=false;show();expect(screen.getByText('일반 도감')).toBeTruthy();expect(screen.queryByText('애니메이션 미리보기')).toBeNull()})
it('waits for verified permissions before rendering preview content',()=>{mock.operator=false;mock.loading=true;show();expect(screen.getByRole('status')).toBeTruthy();expect(screen.queryByText('애니메이션 미리보기')).toBeNull()})
it('allows verified operators',()=>{mock.operator=true;mock.loading=false;show();expect(screen.getByText('애니메이션 미리보기')).toBeTruthy()})
