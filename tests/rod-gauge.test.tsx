import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
import {RodGauge} from '@/features/fishing/rod-gauge'
import {fishingRods} from '@/features/fishing/fishing-rods'
import {FishingWater} from '@/features/fishing/fishing-water'
import {newTensionGame} from '@/features/fishing/tension-game'
afterEach(cleanup)
it('places the floating gauge above the float and paints the line and rod in front of it',()=>{
 const view=render(<FishingWater showGauge rod={fishingRods[0]} game={newTensionGame(()=>.5)} visual={{time:0,tension:38,reel:0,ending:0}} mood="calm" active={false} reduced regionId="pongdang"/>)
 const gauge=view.container.querySelector('[data-fishing-gauge-layer]')!
 const line=view.container.querySelector('[data-fishing-line]')!
 const rod=view.container.querySelector('[data-equipped-rod]')!
 const float=view.container.querySelector('[data-fishing-float]')!
 expect(gauge.compareDocumentPosition(line)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(gauge.compareDocumentPosition(rod)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(gauge.compareDocumentPosition(float)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(gauge.getAttribute('pointer-events')).toBe('none')
 expect(gauge.textContent).toBe('')
 expect(Number(gauge.getAttribute('width'))).toBe(208)
})
it('uses distinct rod themes while preserving the same safety boundaries',()=>{
 const backgrounds=new Set<string>()
 for(const rod of fishingRods){
  const view=render(<RodGauge inline rod={rod} tension={55}/>)
  const gauge=view.container.firstElementChild as HTMLElement
  backgrounds.add(gauge.style.backgroundColor)
  expect(gauge.querySelector('.left-\\[20\\%\\]')).toBeTruthy()
  expect(gauge.querySelector('.left-\\[85\\%\\]')).toBeTruthy()
  expect(screen.getByText('안정')).toBeTruthy()
  view.unmount()
 }
 expect(backgrounds.size).toBe(fishingRods.length)
})
it('keeps danger orange for every rod and hides the numeric value while preparing',()=>{
 const view=render(<RodGauge tension={96}/>)
 expect(screen.getByText('위험')).toBeTruthy()
 expect(view.container.querySelector<HTMLElement>('[style*="width: 96%"]')?.style.background).toBe('rgb(243, 167, 121)')
 view.rerender(<RodGauge tension={38} status="낚시 준비"/>)
 expect(screen.queryByText('38%')).toBeNull()
 expect(screen.queryByText('낚시 준비')).toBeNull()
 expect(screen.queryByText('장력')).toBeNull()
})
