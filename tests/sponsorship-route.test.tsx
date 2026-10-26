import {Suspense} from 'react'
import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter,Outlet} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {AppRoutes} from '@/routes'
vi.mock('@/layouts/app-layout',()=>({AppLayout:()=> <Outlet/>}))
vi.mock('@/components/auth-guard',()=>({AuthGuard:()=> <Outlet/>}))
vi.mock('@/features/onboarding/first-fishing-gate',()=>({FirstFishingGate:()=> <p>첫 낚시 안내</p>}))
vi.mock('@/features/sponsorship/sponsorship-page',()=>({SponsorshipPage:()=> <h1>후원소 입장</h1>}))
vi.mock('@/features/begging/begging-page',()=>({BeggingPage:()=> <h1>사연함 입장</h1>}))
afterEach(cleanup)
it('allows signed-in newcomers to enter sponsorship before the first-fishing tutorial',async()=>{
 render(<MemoryRouter initialEntries={['/square/sponsorship']}><Suspense fallback="준비 중"><AppRoutes/></Suspense></MemoryRouter>)
 expect(await screen.findByRole('heading',{name:'후원소 입장'})).toBeTruthy()
 expect(screen.queryByText('첫 낚시 안내')).toBeNull()
})
it('lets signed-in newcomers reach gold requests before completing the tutorial',async()=>{
 render(<MemoryRouter initialEntries={['/square/begging']}><Suspense fallback="준비 중"><AppRoutes/></Suspense></MemoryRouter>)
 expect(await screen.findByRole('heading',{name:'사연함 입장'})).toBeTruthy()
 expect(screen.queryByText('첫 낚시 안내')).toBeNull()
})
