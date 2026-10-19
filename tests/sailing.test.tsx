import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { SailingPage } from '@/features/regions/sailing-page'
const {load,travel,prepare}=vi.hoisted(()=>({load:vi.fn(),travel:vi.fn(),prepare:vi.fn()}))
vi.mock('@/features/fishing/scene-images',()=>({prepareFishingScene:prepare}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:load,travelRegion:travel}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks()})
function setup(){return render(<MemoryRouter initialEntries={['/sailing/coral']}><Routes><Route path="sailing/:regionId" element={<SailingPage/>}/><Route path="region/:regionId" element={<p>지역에 도착</p>}/></Routes></MemoryRouter>)}
it('waits for real image readiness and then travels immediately',async()=>{
 let finish!:()=>void
 prepare.mockImplementation((_id:string,report:(n:number)=>void)=>{report(.5);return new Promise<void>(resolve=>{finish=resolve})})
 load.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'coral',name:'산호빛 여울',unlocked:true}]})
 travel.mockResolvedValue({currentRegion:'coral'})
 setup();await act(async()=>{})
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('48')
 expect(travel).not.toHaveBeenCalled()
 await act(async()=>finish())
 expect(travel).toHaveBeenCalledExactlyOnceWith('coral')
 expect(screen.getByText('지역에 도착')).toBeTruthy()
})
it('does not commit travel when the player leaves while images load',async()=>{
 let finish!:()=>void
 prepare.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}))
 load.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'coral',name:'산호빛 여울',unlocked:true}]})
 const view=setup();await act(async()=>{});view.unmount()
 await act(async()=>finish())
 expect(travel).not.toHaveBeenCalled()
})
it('keeps failed image preparation retryable without moving the player',async()=>{
 prepare.mockRejectedValue(new Error('SCENE_TIMEOUT'))
 load.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'coral',name:'산호빛 여울',unlocked:true}]})
 setup();await act(async()=>{})
 expect(screen.getByRole('alert').textContent).toContain('낚시터 이미지를 준비')
 expect(travel).not.toHaveBeenCalled()
})
it('rejects locked routes before downloading scene assets',async()=>{
 load.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'coral',name:'산호빛 여울',unlocked:false}]})
 setup();await act(async()=>{})
 expect(screen.getByRole('alert').textContent).toContain('지도가 없어 이동할 수 없어요.')
 expect(prepare).not.toHaveBeenCalled()
})
