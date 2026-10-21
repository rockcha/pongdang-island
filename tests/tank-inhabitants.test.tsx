import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TankInhabitants } from '../src/features/aquarium/tank-inhabitants'
import type { OwnedCollectible } from '../src/features/collection/api'

const mock=vi.hoisted(()=>({setItems:vi.fn(),resize:vi.fn(),setReduced:vi.fn(),setVisible:vi.fn(),destroy:vi.fn(),create:vi.fn()}))
vi.mock('../src/features/aquarium/phaser-tank',()=>({createTankRenderer:mock.create}))
beforeEach(()=>{
 vi.clearAllMocks();mock.create.mockReturnValue(mock)
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}})
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}))
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('creates one renderer and updates the collection without restarting it, then destroys it',async()=>{
 const first={id:'fish-a',species:{name:'멸치'}} as OwnedCollectible
 const second={id:'fish-b',species:{name:'상어'}} as OwnedCollectible
 const view=render(<TankInhabitants items={[first]}/> )
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 view.rerender(<TankInhabitants items={[first,second]}/> )
 expect(mock.setItems).toHaveBeenLastCalledWith([first,second])
 expect(mock.create).toHaveBeenCalledOnce()
 expect(screen.getByText('상어')).toBeTruthy()
 expect(view.container.firstElementChild?.className).toContain('cursor-pointer')
 view.unmount()
 expect(mock.destroy).toHaveBeenCalledOnce()
})

it('zooms the background and renderer together while leaving accessible controls outside',async()=>{
 const view=render(<TankInhabitants items={[]} scenery={<img data-testid="tank-map" alt="배경" src="/map.png"/>}/>)
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 const viewport=view.container.firstElementChild as HTMLElement
 Object.defineProperties(viewport,{clientWidth:{value:300},clientHeight:{value:500}})
 const touch=(type:string,points:number[][])=>{
  const event=new Event(type,{bubbles:true,cancelable:true})
  Object.defineProperty(event,'touches',{value:points.map(([clientX,clientY])=>({clientX,clientY}))})
  viewport.dispatchEvent(event)
 }
 touch('touchstart',[[100,200],[200,200]])
 touch('touchmove',[[50,200],[250,200]])
 const scene=view.container.querySelector('[data-tank-zoom-scene]') as HTMLElement
 const canvasParent=mock.create.mock.calls[0][0] as HTMLElement
 expect(scene.contains(screen.getByTestId('tank-map'))).toBe(true)
 expect(scene.contains(canvasParent)).toBe(true)
 expect(scene.style.transform).toBe('translate(-150px,-200px) scale(2)')
 expect(scene.contains(view.container.querySelector('ul'))).toBe(false)
 expect(canvasParent.style.transform).toBe('')
})
it('shows a helpful error when the renderer cannot start',async()=>{
 mock.create.mockImplementation(()=>{throw new Error('renderer unavailable')})
 render(<TankInhabitants items={[]}/> )
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','어항 화면을 시작하지 못했어요. 새로고침해주세요.')
})
it('places selection controls in screen coordinates after the tank has been zoomed',async()=>{
 const position=vi.fn()
 const view=render(<TankInhabitants items={[]} onSelectionPosition={position}/>)
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 const viewport=view.container.firstElementChild as HTMLElement,parent=mock.create.mock.calls[0][0] as HTMLElement
 Object.defineProperties(parent,{clientWidth:{value:300},clientHeight:{value:500}})
 vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue({left:10,top:20,width:300,height:500} as DOMRect)
 vi.spyOn(parent,'getBoundingClientRect').mockReturnValue({left:-40,top:-80,width:600,height:1000} as DOMRect)
 mock.create.mock.calls[0][8]('fish',100,200)
 expect(position).toHaveBeenCalledWith('fish',150,300)
})
it('resizes for density changes and removes resize listeners when unmounted',async()=>{
 const listeners=new Map<string,()=>void>()
 const media=vi.fn((query:string)=>({matches:false,addEventListener(_event:string,handler:()=>void){listeners.set(query,handler)},removeEventListener(){}}))
 vi.stubGlobal('matchMedia',media)
 const view=render(<TankInhabitants items={[]}/>)
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 const change=[...listeners].find(([query])=>query.startsWith('(resolution:'))![1]
 vi.stubGlobal('devicePixelRatio',2)
 change()
 expect(mock.resize).toHaveBeenCalledOnce()
 expect(media).toHaveBeenCalledWith('(resolution: 2dppx)')
 window.dispatchEvent(new Event('resize'));expect(mock.resize).toHaveBeenCalledTimes(2)
 view.unmount();window.dispatchEvent(new Event('resize'));expect(mock.resize).toHaveBeenCalledTimes(2)
})
