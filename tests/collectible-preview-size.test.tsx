import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {CollectiblePreview} from '@/features/collection/collectible-preview'
import {collectibleUrl,type Species} from '@/features/collection/api'
vi.mock('@/lib/client',()=>({createClient:()=>({storage:{from:()=>({getPublicUrl:(path:string)=>({data:{publicUrl:'https://example.test/'+path}})})}})}))
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
it('doubles the detail canvas and drawn creature while preserving the normal preview',()=>{
 let nextFrame:(time:number)=>void=()=>{}
 const drawImage=vi.fn(),clearRect=vi.fn()
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({setTransform:vi.fn(),clearRect,drawImage} as unknown as CanvasRenderingContext2D)
 vi.stubGlobal('requestAnimationFrame',(callback:(time:number)=>void)=>{nextFrame=callback;return 1})
 vi.stubGlobal('cancelAnimationFrame',vi.fn())
 vi.stubGlobal('matchMedia',()=>({matches:false}))
 vi.stubGlobal('devicePixelRatio',1)
 vi.stubGlobal('Image',class {width=1254;height=1254;onload:(()=>void)|null=null;onerror=null;set src(_value:string){this.onload?.()}})
 const species={id:'preview-size-test',name:'미리보기',rarity:'common',sprite_sheet_path:'fish/normal/test_sprite.png'} as Species
 const view=render(<CollectiblePreview species={species}/>)
 const canvas=screen.getByRole('img',{name:'미리보기 움직이는 모습'}) as HTMLCanvasElement
 nextFrame(100)
 expect(canvas.width).toBe(160)
 expect(drawImage.mock.calls.at(-1)?.slice(-2)).toEqual([128,128])
 view.rerender(<CollectiblePreview species={species} large/>)
 nextFrame(200)
 expect(canvas.width).toBe(320)
 expect(drawImage.mock.calls.at(-1)?.slice(-2)).toEqual([256,256])
 expect(canvas.parentElement?.style.maxWidth).toBe('100%')
})
it('refreshes both replaced mirrorscale images without changing other species URLs',()=>{
 for(const type of ['sprite','thumbnail'])expect(collectibleUrl(`fish/epic/lunea-mirrorscale_${type}.png`)).toContain('?v=mirrorscale-lavender-v2')
 expect(collectibleUrl('fish/epic/lunea-knight_sprite.png')).not.toContain('?v=')
})
