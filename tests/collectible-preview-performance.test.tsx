import {act,cleanup,render} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {CollectiblePreview} from '@/features/collection/collectible-preview'
import type {Species} from '@/features/collection/api'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>path}))
const species={id:'preview-performance',name:'멸치',rarity:'common',sprite_sheet_path:'fish/normal/test_sprite.png'} as Species
let drawImage:ReturnType<typeof vi.fn>,intersect:(visible:boolean)=>void,media:EventTarget&{matches:boolean}
beforeEach(()=>{
 vi.useFakeTimers();drawImage=vi.fn();media=Object.assign(new EventTarget(),{matches:false})
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({setTransform:vi.fn(),clearRect:vi.fn(),drawImage} as unknown as CanvasRenderingContext2D)
 vi.stubGlobal('matchMedia',()=>media)
 vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>setTimeout(()=>callback(performance.now()),16)))
 vi.stubGlobal('cancelAnimationFrame',clearTimeout)
 vi.stubGlobal('IntersectionObserver',class{constructor(callback){intersect=visible=>callback([{isIntersecting:visible}])}observe(){}disconnect(){}})
 vi.stubGlobal('Image',class {width=256;height=256;onload:(()=>void)|null=null;onerror=null;set src(_src:string){this.onload?.()}})
})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()})
const advance=async(ms:number)=>act(()=>vi.advanceTimersByTimeAsync(ms))
it('draws only changed sprite frames and stops all scheduled frames offscreen and in hidden tabs',async()=>{
 render(<CollectiblePreview species={species}/>);await advance(1000)
 expect(drawImage.mock.calls.length).toBeGreaterThan(1);expect(drawImage.mock.calls.length).toBeLessThanOrEqual(6)
 act(()=>intersect(false));const count=drawImage.mock.calls.length,requests=vi.mocked(requestAnimationFrame).mock.calls.length
 await advance(1000);expect(drawImage).toHaveBeenCalledTimes(count);expect(requestAnimationFrame).toHaveBeenCalledTimes(requests)
 act(()=>intersect(true));await advance(100);expect(drawImage.mock.calls.length).toBeGreaterThan(count)
 const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(true)
 act(()=>document.dispatchEvent(new Event('visibilitychange')));const hiddenCount=drawImage.mock.calls.length
 await advance(1000);expect(drawImage).toHaveBeenCalledTimes(hiddenCount)
 hidden.mockReturnValue(false);act(()=>document.dispatchEvent(new Event('visibilitychange')));await advance(100)
 expect(drawImage.mock.calls.length).toBeGreaterThan(hiddenCount)
})
it('renders reduced motion once and resumes if the preference changes',async()=>{
 media.matches=true;render(<CollectiblePreview species={species}/>);await advance(1000)
 expect(drawImage).toHaveBeenCalledOnce();expect(requestAnimationFrame).toHaveBeenCalledOnce()
 media.matches=false;act(()=>media.dispatchEvent(new Event('change')));await advance(1000)
 expect(drawImage.mock.calls.length).toBeGreaterThan(1)
})
