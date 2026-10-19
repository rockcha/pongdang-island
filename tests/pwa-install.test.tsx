import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'

const handlers=new Map<string,EventListener>()
beforeEach(()=>{
 vi.resetModules();handlers.clear()
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn()})))
 vi.spyOn(window,'addEventListener').mockImplementation((name,handler)=>{handlers.set(name,handler as EventListener)})
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
function offer(outcome='dismissed'){
 const event=Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt:vi.fn().mockResolvedValue(undefined),userChoice:Promise.resolve({outcome})})
 handlers.get('beforeinstallprompt')!(event)
 return event
}
it('retains an early install offer and consumes each prompt only once',async()=>{
 const pwa=await import('@/features/pwa/install');pwa.initializePwaInstall()
 const event=offer()
 await Promise.all([pwa.installPwa(),pwa.installPwa()])
 expect(event.defaultPrevented).toBe(true)
 expect(event.prompt).toHaveBeenCalledOnce()
 const next=offer('accepted');await pwa.installPwa()
 expect(next.prompt).toHaveBeenCalledOnce()
})
it('shows an installed state only after browser confirmation',async()=>{
 const pwa=await import('@/features/pwa/install');pwa.initializePwaInstall();offer('accepted')
 await pwa.installPwa()
 const {DownloadPage}=await import('@/pages/download-page');render(<DownloadPage/>)
 expect(screen.queryByRole('status')).toBeNull()
 const {act}=await import('@testing-library/react')
 await act(async()=>handlers.get('appinstalled')!(new Event('appinstalled')))
 expect(screen.getByRole('status').textContent).toContain('준비가 되었어요')
})
it('keeps manual instructions available without an install event',async()=>{
 const {DownloadPage}=await import('@/pages/download-page');render(<DownloadPage/>)
 expect((screen.getByRole('button',{name:'퐁당섬 설치하기'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'아이폰'}))
 expect(screen.getByText('Safari에서 설치하기')).toBeTruthy()
 expect(screen.getByText(/웹 앱으로 열기/)).toBeTruthy()
})
it('recovers from a rejected prompt and allows a fresh browser offer',async()=>{
 const pwa=await import('@/features/pwa/install');pwa.initializePwaInstall()
 const event=offer();event.prompt.mockRejectedValueOnce(new Error('browser denied'))
 await pwa.installPwa()
 const {DownloadPage}=await import('@/pages/download-page');render(<DownloadPage/>)
 expect(screen.getByRole('alert').textContent).toContain('설치 창을 열지 못했어요')
 const {act}=await import('@testing-library/react');await act(async()=>{offer()})
 await waitFor(()=>expect((screen.getByRole('button',{name:'퐁당섬 설치하기'}) as HTMLButtonElement).disabled).toBe(false))
})
