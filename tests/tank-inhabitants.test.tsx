import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TankInhabitants } from '@/features/aquarium/tank-inhabitants'
import type { OwnedCollectible, Species } from '@/features/collection/api'

vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>`/assets/${path}`}))
let tick:FrameRequestCallback
beforeEach(()=>{
 vi.spyOn(performance,'now').mockReturnValue(1000)
 vi.stubGlobal('requestAnimationFrame',vi.fn((callback:FrameRequestCallback)=>{tick=callback;return 1}))
 vi.stubGlobal('cancelAnimationFrame',vi.fn())
 vi.stubGlobal('ResizeObserver',class{observe(){} disconnect(){}})
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}))
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
function item(kind:Species['kind']):OwnedCollectible{
 return {id:kind,user_id:'me',species_id:kind,tank_id:'tank',animation_seed:0,position_x:null,position_y:null,acquired_at:'now',species:{id:kind,kind,name:kind,description:'',swim_y_min:0.2,swim_y_max:0.7,speed:0.05,size:72,rarity:'common',sprite_sheet_path:kind==='fish'?'fish/normal/pongul_sprite.png':null,thumbnail_path:`${kind}/${kind}_thumbnail.png`,sell_price:10}} as OwnedCollectible
}
it('shows exactly one quadrant at a time in the four-frame sheet without moving the sheet element',()=>{
 const view=render(<TankInhabitants items={[item('fish')]}/>)
 const sheet=view.container.querySelector<HTMLElement>('[data-fish-sheet]')!
 expect(sheet.style.backgroundImage).toContain('/assets/fish/normal/pongul_sprite.png')
 expect(sheet.style.backgroundSize).toBe('200% 200%')
 expect(view.container.querySelectorAll('img')).toHaveLength(0)
 for(const [time,position] of [[1000,'0% 0%'],[1210,'100% 0%'],[1410,'0% 100%'],[1610,'100% 100%']] as const){tick(time);expect(sheet.style.backgroundPosition).toBe(position);expect(sheet.style.transform).toBe('')}
})
it('uses thumbnails for trash and structures, rotating only trash',()=>{
 render(<TankInhabitants items={[item('trash'),item('structure')]}/>)
 const structure=screen.getByRole('img',{name:'structure'})
 const initial=structure.style.transform
 tick(2000)
 expect(structure.style.transform).toBe(initial)
 expect(screen.getByRole('img',{name:'trash'}).style.transform).toContain('rotate(25deg)')
})
