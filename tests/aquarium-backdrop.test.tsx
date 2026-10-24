import {cleanup,render,screen,act,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AquariumBackdrop} from '@/features/aquarium/aquarium-backdrop'
vi.mock('@/features/aquarium/api',()=>({backgroundUrl:(path:string)=>path}))
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('pans the local wide background without reloading it on camera updates',()=>{
 const images:{onload:()=>void;onerror:()=>void;src:string}[]=[]
 vi.stubGlobal('Image',class {onload=()=>{};onerror=()=>{};src='';constructor(){images.push(this)}})
 const view=render(<AquariumBackdrop background={{name:'기본 어항',image_path:'default.png'}} panorama={{src:'/local-panorama.png',view:1}}/>)
 expect(images[0].src).toBe('/local-panorama.png')
 act(()=>images[0].onload())
 const before=screen.getByAltText('기본 어항').getAttribute('style')
 view.rerender(<AquariumBackdrop background={{name:'기본 어항',image_path:'default.png'}} panorama={{src:'/local-panorama.png',view:2}}/>)
 expect(images).toHaveLength(1)
 expect(screen.getByAltText('기본 어항').getAttribute('style')).not.toBe(before)
})
it('keeps the previous background visible until the next image is ready',async()=>{
 const images:{onload:()=>void;onerror:()=>void;src:string}[]=[]
 vi.stubGlobal('Image',class {onload=()=>{};onerror=()=>{};src='';constructor(){images.push(this)}})
 const {rerender}=render(<AquariumBackdrop background={{name:'First',image_path:'/first.png'}}/>)
 expect(screen.getByRole('status')).toBeTruthy()
 act(()=>images[0].onload())
 expect(screen.queryByRole('status')).toBeNull()
 expect(screen.getByAltText('First')).toBeTruthy()
 rerender(<AquariumBackdrop background={{name:'Next',image_path:'/next.png'}}/>)
 expect(screen.getByAltText('First')).toBeTruthy()
 expect(screen.queryByAltText('Next')).toBeNull()
 act(()=>images[1].onload())
 expect(screen.getByAltText('Next')).toBeTruthy()
 expect(document.querySelectorAll('img')).toHaveLength(2)
 await waitFor(()=>expect(document.querySelectorAll('img')).toHaveLength(1))
})
it('ends initial loading when the background fails',()=>{
 let fail=()=>{}
 vi.stubGlobal('Image',class {set onerror(handler:()=>void){fail=handler}onload=()=>{};src=''})
 render(<AquariumBackdrop background={{name:'Missing',image_path:'/missing.png'}}/>)
 act(()=>fail())
 expect(screen.queryByRole('status')).toBeNull()
})
it('waits for background decoding before reporting it as prepared',async()=>{
 let loaded=()=>{},decoded=()=>{}
 vi.stubGlobal('Image',class {onerror=()=>{};src='';set onload(handler:()=>void){loaded=handler}decode(){return new Promise<void>(resolve=>{decoded=resolve})}})
 render(<AquariumBackdrop background={{name:'Decoded sea',image_path:'/sea.png'}}/> )
 act(()=>loaded())
 expect(screen.getByRole('status')).toBeTruthy();expect(screen.queryByAltText('Decoded sea')).toBeNull()
 await act(async()=>decoded())
 expect(screen.queryByRole('status')).toBeNull();expect(screen.getByAltText('Decoded sea')).toBeTruthy()
})
