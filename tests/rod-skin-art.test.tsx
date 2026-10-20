import {createRef} from 'react'
import {cleanup,render} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
import {FishingReel} from '@/features/fishing/fishing-reel'
import {FishingWater} from '@/features/fishing/fishing-water'
import {fishingRods} from '@/features/fishing/fishing-rods'
import {newTensionGame} from '@/features/fishing/tension-game'
afterEach(cleanup)
it('changes reel decoration while preserving gauge geometry, rotation and controls',()=>{
 const props={active:true,waiting:false,won:false,pressed:false,reduced:false,tension:62,rotation:144,buttonRef:createRef<HTMLButtonElement>(),onHold:()=>{},onRelease:()=>{}}
 const view=render(<FishingReel {...props}/>)
 const button=view.container.querySelector('button')!
 const original={label:button.getAttribute('aria-label'),size:button.className,gauge:(view.container.querySelector('[data-rod-gauge] span[style]') as HTMLElement).style.width}
 for(const {id} of fishingRods){
  view.rerender(<FishingReel {...props} rod={fishingRods.find(r=>r.id===id)}/>)
  expect(view.container.querySelector('[data-skin-frame]')?.getAttribute('data-skin-frame')).toBe(id)
  expect(view.container.querySelector('[data-skin-rotor]')?.parentElement?.getAttribute('transform')).toBe('rotate(144)')
  expect((view.container.querySelector('[data-rod-gauge] span[style]') as HTMLElement).style.width).toBe(original.gauge)
  expect(button.getAttribute('aria-label')).toBe(original.label)
  expect(button.className).toBe(original.size)
 }
})
it('keeps rod bending and float transform identical across every rod',()=>{
 const game={...newTensionGame(()=>.5),phase:'playing' as const,time:5}
 const props={game,visual:{time:5,tension:60,reel:72,ending:0},mood:'surge' as const,active:true,reduced:false,regionId:'pongdang',pulling:true}
 const view=render(<FishingWater {...props}/>)
 const path=view.container.querySelector('path[stroke="#102b42"]')?.getAttribute('d')
 const originalFloat=view.container.querySelector('path[fill="#eb886f"]')?.parentElement?.getAttribute('transform')
 for(const {id} of fishingRods){
  view.rerender(<FishingWater {...props} rod={fishingRods.find(r=>r.id===id)}/>)
  expect(view.container.querySelector('path[stroke="#102b42"]')?.getAttribute('d')).toBe(path)
  const shaft=view.container.querySelector('[data-skin-shaft]')
  {
   expect(shaft?.getAttribute('data-skin-shaft')).toBe(id)
   for(const layer of shaft!.querySelectorAll('path'))expect(layer.getAttribute('d')).toBe(path)
  }
  expect(view.container.querySelector('[data-skin-float]')?.parentElement?.getAttribute('transform')).toBe(originalFloat)
 }
})
