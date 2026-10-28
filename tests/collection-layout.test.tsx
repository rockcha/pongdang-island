import {cleanup,render,screen} from '@testing-library/react'
import {MemoryRouter,Routes,Route} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {AppLayout} from '@/layouts/app-layout'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:null})}))
vi.mock('@/features/gold/gold-provider',()=>({useGold:()=>({wallet:{gold:0},loading:false,error:null}),GoldIcon:()=>null}))
vi.mock('@/features/fishing/fishing-trip',()=>({useFishingTripRoute:()=>{}}))
vi.mock('@/components/island-news-popup',()=>({IslandNewsPopup:()=>null}))
afterEach(cleanup)
it.each(['/collection','/collection/','/item-collection','/item-collection/','/collection-animation','/collection-animation/'])('constrains %s to the viewport so the catalog can scroll internally',path=>{
 render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<AppLayout/>}><Route path="*" element={<div>도감 내용</div>}/></Route></Routes></MemoryRouter>)
 const main=screen.getByRole('main'),shell=main.parentElement!
 expect(shell.style.height).toBe('100dvh')
 expect(shell.style.overflow).toBe('hidden')
 expect(main.classList.contains('min-h-0')).toBe(true)
 expect(main.classList.contains('overflow-hidden')).toBe(true)
})
