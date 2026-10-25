import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TankInhabitants } from '../src/features/aquarium/tank-inhabitants'
import type { OwnedCollectible } from '../src/features/collection/api'
import {useState} from 'react'
import {MemoryRouter} from 'react-router'
import {Dialog,DialogContent,DialogTitle} from '@/components/ui/dialog'
import {fireEvent} from '@testing-library/react'
import {AquariumBackdrop} from '@/features/aquarium/aquarium-backdrop'

const mock=vi.hoisted(()=>({setItems:vi.fn(),setView:vi.fn(),setZoom:vi.fn(),cancelGesture:vi.fn(),resize:vi.fn(),setReduced:vi.fn(),setVisible:vi.fn(),destroy:vi.fn(),create:vi.fn()}))
vi.mock('../src/features/aquarium/phaser-tank',()=>({createTankRenderer:mock.create}))
beforeEach(()=>{
 vi.clearAllMocks();mock.create.mockImplementation((...args)=>{args[10]?.(true);return mock})
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}})
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}))
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('keeps the renderer during camera moves and preserves the old mode for other themes',async()=>{
 const world={columns:3 as const,preserveArrangement:true}
 const view=render(<TankInhabitants items={[]} world={world} viewRequest={{position:1}}/>)
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 expect(mock.create.mock.calls[0][9]).toMatchObject({columns:3,preserveArrangement:true})
 view.rerender(<TankInhabitants items={[]} world={world} viewRequest={{position:2}}/>)
 expect(mock.setView).toHaveBeenLastCalledWith(2)
 expect(mock.create).toHaveBeenCalledOnce()
 view.rerender(<TankInhabitants items={[]}/>)
 await waitFor(()=>expect(mock.create).toHaveBeenCalledTimes(2))
 expect(mock.create.mock.calls[1][9]).toBeUndefined()
 expect(mock.destroy).toHaveBeenCalledOnce()
})
it('sleeps behind an open modal and resumes after dismissal',async()=>{
 function View(){const [open,setOpen]=useState(false);return <MemoryRouter><TankInhabitants items={[]}/><button onClick={()=>setOpen(true)}>소식 보기</button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>소식</DialogTitle><button onClick={()=>setOpen(false)}>닫기</button></DialogContent></Dialog></MemoryRouter>}
 render(<View/>);await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 fireEvent.click(screen.getByRole('button',{name:'소식 보기'}))
 await waitFor(()=>expect(mock.setVisible).toHaveBeenLastCalledWith(false))
 expect(document.querySelector('[data-tank-zoom-scene]')?.getAttribute('data-motion-paused')).toBe('true')
 fireEvent.click(screen.getByRole('button',{name:'닫기',exact:true}))
 await waitFor(()=>expect(mock.setVisible).toHaveBeenLastCalledWith(true))
 expect(document.querySelector('[data-tank-zoom-scene]')?.getAttribute('data-motion-paused')).toBe('false')
})
it('creates one renderer and updates the collection without restarting it, then destroys it',async()=>{
 const first={id:'fish-a',species:{name:'멸치'}} as OwnedCollectible
 const second={id:'fish-b',species:{name:'상어'}} as OwnedCollectible
 const view=render(<TankInhabitants items={[first]}/> )
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 view.rerender(<TankInhabitants items={[first,second]}/> )
 expect(mock.setItems).toHaveBeenLastCalledWith([first,second])
 expect(mock.create).toHaveBeenCalledOnce()
 act(()=>mock.create.mock.calls[0][10](true))
 expect(screen.getByText('상어')).toBeTruthy()
 expect(view.container.firstElementChild?.className).toContain('cursor-pointer')
 view.unmount()
 expect(mock.destroy).toHaveBeenCalledOnce()
})

it('zooms the background and renderer together while leaving accessible controls outside',async()=>{
 const view=render(<TankInhabitants items={[]} world={{columns:3,overview:true,initialZoom:1,initialView:1,minZoom:1,maxZoom:2}} scenery={<img data-testid="tank-map" alt="배경" src="/map.png"/>}/>)
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
 expect(scene.style.transform).toBe('')
 expect(mock.setZoom).toHaveBeenCalledWith(2,expect.any(Number),undefined)
 expect(scene.contains(view.container.querySelector('ul'))).toBe(false)
 expect(canvasParent.style.transform).toBe('')
})
it('shows a helpful error when the renderer cannot start',async()=>{
 mock.create.mockImplementation(()=>{throw new Error('renderer unavailable')})
 render(<TankInhabitants items={[]}/> )
 expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('어항 화면을 시작하지 못했어요. 새로고침해주세요.'))
})
it('hides the entire tank until both the background and the rendered inhabitants are ready',async()=>{
 mock.create.mockImplementation(()=>mock)
 const images:{onload:()=>void;onerror:()=>void;src:string}[]=[]
 vi.stubGlobal('Image',class {onload=()=>{};onerror=()=>{};src='';constructor(){images.push(this)}})
 const view=render(<TankInhabitants items={[]} scenery={<AquariumBackdrop background={{name:'Sea',image_path:'sea.png',url:'/sea.png'}}/>}/> )
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 const scene=view.container.querySelector('[data-tank-zoom-scene]') as HTMLElement
 expect(scene.style.visibility).toBe('hidden');expect(screen.getByRole('status').textContent).toContain('어항을 준비')
 act(()=>mock.create.mock.calls[0][10](true))
 expect(scene.style.visibility).toBe('hidden')
 act(()=>images[0].onload())
 expect(scene.style.visibility).toBe('visible');expect(screen.queryByRole('status')).toBeNull()
})
it('keeps an already loaded background covered until the first rendered frame is ready',async()=>{
 mock.create.mockImplementation(()=>mock)
 let loaded=()=>{}
 vi.stubGlobal('Image',class {set onload(value:()=>void){loaded=value}onerror=()=>{};src=''})
 const view=render(<TankInhabitants items={[]} scenery={<AquariumBackdrop background={{name:'Sea',image_path:'sea.png',url:'/sea.png'}}/>}/> )
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 act(()=>loaded());expect(screen.getByRole('status')).toBeTruthy()
 act(()=>mock.create.mock.calls[0][10](true))
 expect(view.container.firstElementChild?.getAttribute('data-tank-ready')).toBe('true')
})
it('never reveals a partial tank after failure and rebuilds the assets on retry',async()=>{
 mock.create.mockImplementation(()=>mock)
 const view=render(<TankInhabitants items={[]}/> )
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 act(()=>mock.create.mock.calls[0][3]('일부 개체 이미지를 불러오지 못했어요.'))
 expect(view.container.querySelector<HTMLElement>('[data-tank-zoom-scene]')?.style.visibility).toBe('hidden')
 expect(screen.getByRole('alert')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'다시 준비하기'}))
 await waitFor(()=>expect(mock.create).toHaveBeenCalledTimes(2))
 expect(mock.destroy).toHaveBeenCalledOnce()
 act(()=>mock.create.mock.calls[0][10](true))
 expect(view.container.firstElementChild?.getAttribute('data-tank-ready')).toBe('false')
 act(()=>mock.create.mock.calls[1][10](true))
 expect(view.container.firstElementChild?.getAttribute('data-tank-ready')).toBe('true')
})
it('keeps a failed background covered and ignores late signals from before a retry',async()=>{
 const images:{onload:()=>void;onerror:()=>void;src:string}[]=[]
 vi.stubGlobal('Image',class {onload=()=>{};onerror=()=>{};src='';constructor(){images.push(this)}})
 const view=render(<TankInhabitants items={[]} scenery={<AquariumBackdrop background={{name:'Sea',image_path:'sea.png',url:'/sea.png'}}/>}/> )
 await waitFor(()=>expect(mock.create).toHaveBeenCalledOnce())
 const stale=images[0].onload
 act(()=>images[0].onerror())
 expect(screen.getByRole('alert').textContent).toContain('어항 배경')
 fireEvent.click(screen.getByRole('button',{name:'다시 준비하기'}))
 await waitFor(()=>expect(mock.create).toHaveBeenCalledTimes(2))
 act(()=>stale())
 expect(view.container.firstElementChild?.getAttribute('data-tank-ready')).toBe('false')
 act(()=>images[1].onload())
 expect(view.container.firstElementChild?.getAttribute('data-tank-ready')).toBe('true')
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
