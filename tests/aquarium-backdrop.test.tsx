import {cleanup,render,screen,act} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AquariumBackdrop} from '@/features/aquarium/aquarium-backdrop'
vi.mock('@/features/aquarium/api',()=>({backgroundUrl:(path:string)=>path}))
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('keeps the previous background visible until the next image is ready',()=>{
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
})
it('ends initial loading when the background fails',()=>{
 let fail=()=>{}
 vi.stubGlobal('Image',class {set onerror(handler:()=>void){fail=handler}onload=()=>{};src=''})
 render(<AquariumBackdrop background={{name:'Missing',image_path:'/missing.png'}}/>)
 act(()=>fail())
 expect(screen.queryByRole('status')).toBeNull()
})
