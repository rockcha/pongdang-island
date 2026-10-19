import {act,cleanup,renderHook,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const images:{src:string;onload:()=>void;onerror:()=>void}[]=[]
beforeEach(()=>{
 vi.resetModules();images.length=0
 vi.stubGlobal('Image',class {
  src='';onload=()=>{};onerror=()=>{}
  decode=()=>Promise.resolve()
  constructor(){images.push(this)}
 })
})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers()})
it('shares completed sailing preparation with the destination without a second loading screen',async()=>{
 const {prepareFishingScene,useFishingSceneImages}=await import('@/features/fishing/scene-images')
 const progress:number[]=[]
 const prepared=prepareFishingScene('pongdang',fraction=>progress.push(fraction))
 images.forEach(image=>image.onload())
 await prepared
 expect(progress.at(-1)).toBe(1)
 const view=renderHook(()=>useFishingSceneImages('pongdang'))
 expect(view.result.current).toBe(true)
 expect(new Set(images.map(image=>image.src)).size).toBe(images.length)
})
it('reveals the scene together after the banner scenery and platform are ready',async()=>{
 const {useFishingSceneImages}=await import('@/features/fishing/scene-images')
 const view=renderHook(()=>useFishingSceneImages('pongdang'))
 expect(view.result.current).toBe(false)
 await act(async()=>{images.filter(i=>!i.src.includes('platforms')).forEach(i=>i.onload())})
 expect(view.result.current).toBe(false)
 await act(async()=>images.find(i=>i.src.includes('platforms'))!.onload())
 await waitFor(()=>expect(view.result.current).toBe(true))
})
it('lets existing fallbacks display if a scene asset fails',async()=>{
 const {useFishingSceneImages}=await import('@/features/fishing/scene-images')
 const view=renderHook(()=>useFishingSceneImages('pongdang'))
 await act(async()=>images.forEach(i=>i.onerror()))
 await waitFor(()=>expect(view.result.current).toBe(true))
})
it('does not block controls forever on a stalled connection',async()=>{
 vi.useFakeTimers()
 const {useFishingSceneImages}=await import('@/features/fishing/scene-images')
 const view=renderHook(()=>useFishingSceneImages('pongdang'))
 expect(view.result.current).toBe(false)
 await act(async()=>vi.advanceTimersByTime(8000))
 expect(view.result.current).toBe(true)
})
