import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { HarborPage } from '@/pages/harbor-page'
vi.mock('@/features/fishing/fishing-panel',()=>({BaitInventoryDialog:()=>null}))
const { load, travel }=vi.hoisted(()=>({load:vi.fn(),travel:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:load,travelRegion:travel,regionImageUrl:(path:string)=>`/test/${path}`}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it('shows locked destinations in grayscale while keeping their name, description and rarity visible',async()=>{
 load.mockResolvedValue({currentRegion:'pongdang',regions:[
 {id:'pongdang',name:'퐁당섬 앞바다',description:'잔잔한 바다',rarity:'common',image_path:'pongdang.png',requires_map_fragment:false,unlocked:true,hasFragment:false},
 {id:'starruins',name:'별잠 유적',description:'별빛을 품은 유적',rarity:'rare',image_path:'starruins.png',requires_map_fragment:true,unlocked:false,hasFragment:false}]})
 render(<MemoryRouter><HarborPage/></MemoryRouter>);await screen.findByRole('heading',{name:'퐁당섬 앞바다'})
 fireEvent.click(screen.getByRole('button',{name:'지도 열기'}))
 const dialog=await screen.findByRole('dialog')
 await within(dialog).findByRole('button',{name:'다음 지역'})
 fireEvent.click(within(dialog).getByRole('button',{name:'다음 지역'}))
 expect(within(dialog).getByRole('heading',{name:'별잠 유적'})).toBeTruthy()
 expect(within(dialog).getByText('별빛을 품은 유적')).toBeTruthy()
 expect(within(dialog).getByText('희귀').className).toContain('rarity-rare')
 expect(within(dialog).getByRole('img',{name:'별잠 유적'}).className).toContain('grayscale')
 expect((within(dialog).getByRole('button',{name:'잠긴 항로'}) as HTMLButtonElement).disabled).toBe(true)
 expect(travel).not.toHaveBeenCalled()
})
