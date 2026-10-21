import {cleanup,render,waitFor} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {toast} from 'sonner'
import {Toaster} from '@/components/ui/sonner'
afterEach(()=>{toast.dismiss();cleanup()})
it('puts the Pongi starfish image beside notification text',async()=>{
 render(<Toaster/>)
 toast.success('청동 낚싯대를 구매했습니다.')
 await waitFor(()=>expect(document.body.querySelector('[data-sonner-toast] [data-title]')?.textContent).toBe('청동 낚싯대를 구매했습니다.'))
 const image=document.body.querySelector('[data-icon] img')
 expect(image?.getAttribute('src')).toBe('/branding/pongi-starfish.png')
 expect(image?.getAttribute('alt')).toBe('')
 expect(document.body.querySelector('[data-sonner-toaster]')?.getAttribute('data-y-position')).toBe('top')
 expect(document.body.querySelector('[data-sonner-toaster]')?.getAttribute('data-x-position')).toBe('center')
})
