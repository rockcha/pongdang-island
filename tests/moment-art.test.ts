import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {practiceSpecies} from '@/features/fishing/fishing-practice'
const loaded:string[]=[],fills:string[]=[]
const mock=vi.hoisted(()=>({failed:new Set<string>(),font:vi.fn()}))
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/original/'+path}))
vi.mock('@/features/collection/thumbnail-art',()=>({optimizedThumbnailUrl:()=>'/optimized.webp'}))
beforeEach(()=>{
 vi.resetModules();loaded.length=0;fills.length=0;mock.failed.clear();mock.font.mockReset().mockResolvedValue([])
 Object.defineProperty(document,'fonts',{configurable:true,value:{load:mock.font}})
 vi.stubGlobal('Image',class {
  crossOrigin='';naturalWidth=640;naturalHeight=480;onload=()=>{};onerror=()=>{};url=''
  set src(url:string){this.url=url;if(!url)return;loaded.push(url);queueMicrotask(()=>mock.failed.has(url)?this.onerror():this.onload())}
  get src(){return this.url}
 })
 const context=new Proxy({measureText:(text:string)=>({width:text.length*18}),createRadialGradient:()=>({addColorStop:vi.fn()})},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{},set:(target,key,value)=>{if(key==='fillStyle')fills.push(value);Reflect.set(target,key,value);return true}})
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers()})

it('paints ink catches on paper, uses optimized artwork and tolerates older snapshots without descriptions',async()=>{
 const {paintCatchMoment}=await import('@/features/showcase/moment-art')
 const fish={...practiceSpecies('epic'),id:'muk-test',description:undefined} as unknown as ReturnType<typeof practiceSpecies>
 mock.font.mockRejectedValue(new Error('font offline'))
 await paintCatchMoment(document.createElement('canvas'),{species:fish,regionName:'묵향 해역'})
 expect(fills[0]).toBe('#f5eedf');expect(fills).toContain('#303b36')
 expect(loaded).toContain('/optimized.webp');expect(loaded).not.toContain('/original/'+fish.thumbnail_path)
})

it('uses the original when the optimized thumbnail is unavailable',async()=>{
 const {paintCatchMoment}=await import('@/features/showcase/moment-art'),fish=practiceSpecies('mythic')
 mock.failed.add('/optimized.webp');await paintCatchMoment(document.createElement('canvas'),{species:fish})
 expect(loaded).toContain('/original/'+fish.thumbnail_path);expect(fills[0]).toBe('#101b2a')
})

it('does not let a stalled font request block a valid catch image indefinitely',async()=>{
 vi.useFakeTimers();mock.font.mockReturnValue(new Promise(()=>{}))
 const {paintCatchMoment}=await import('@/features/showcase/moment-art')
 const task=paintCatchMoment(document.createElement('canvas'),{species:practiceSpecies('epic')})
 await vi.advanceTimersByTimeAsync(1500);await task
 expect(fills).toContain('#101b2a')
})
