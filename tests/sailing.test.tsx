import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { SailingPage } from '@/features/regions/sailing-page'
const {load,travel}=vi.hoisted(()=>({load:vi.fn(),travel:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:load,travelRegion:travel}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks()})
function setup(){return render(<MemoryRouter initialEntries={['/sailing/coral']}><Routes><Route path="sailing/:regionId" element={<SailingPage/>}/><Route path="region/:regionId" element={<p>지역에 도착</p>}/></Routes></MemoryRouter>)}
it('waits five seconds, commits travel and navigates to destination',async()=>{
 vi.useFakeTimers()
 load.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'coral',name:'산호빛 여울',unlocked:true}]})
 travel.mockResolvedValue({currentRegion:'coral'})
 setup()
 await act(async()=>{})
 expect(screen.getByRole('status').textContent).toContain('산호빛 여울')
 await act(async()=>{vi.advanceTimersByTime(4999)})
 expect(travel).not.toHaveBeenCalled()
 await act(async()=>{vi.advanceTimersByTime(1)})
 expect(travel).toHaveBeenCalledExactlyOnceWith('coral')
 expect(screen.getByText('지역에 도착')).toBeTruthy()
})
it('rejects locked routes and cancels the pending timer on unmount',async()=>{
 vi.useFakeTimers()
 load.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'coral',name:'산호빛 여울',unlocked:false}]})
 const first=setup();await act(async()=>{})
 expect(screen.getByRole('alert').textContent).toContain('지도 조각')
 first.unmount()
 load.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'coral',name:'산호빛 여울',unlocked:true}]})
 const second=setup();await act(async()=>{});second.unmount()
 await act(async()=>{vi.advanceTimersByTime(6000)})
 expect(travel).not.toHaveBeenCalled()
})
