import {StrictMode,useState} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {BrowserRouter,Link,Route,Routes} from 'react-router'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {Dialog,DialogContent,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {OverlayHistoryTracker} from '@/components/overlay-back'

class NativeCloseWatcher extends EventTarget{
 static active:NativeCloseWatcher[]=[]
 constructor(){super();NativeCloseWatcher.active.push(this)}
 destroy(){NativeCloseWatcher.active=NativeCloseWatcher.active.filter(item=>item!==this)}
 requestClose(){const allowed=this.dispatchEvent(new Event('cancel',{cancelable:true}));if(allowed){this.destroy();this.dispatchEvent(new Event('close'))}}
}
beforeEach(()=>{history.replaceState({idx:0,key:'test',usr:null},'','/');vi.stubGlobal('CloseWatcher',NativeCloseWatcher)})
afterEach(async()=>{cleanup();await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});vi.unstubAllGlobals()})

function Example({dirty=false,busy=false}:{dirty?:boolean;busy?:boolean}){
 const [open,setOpen]=useState(false),[confirm,setConfirm]=useState(false)
 return <><Dialog open={open} onOpenChange={next=>{if(busy)return;if(!next&&dirty)setConfirm(true);else setOpen(next)}}>
  <DialogTrigger>도구 열기</DialogTrigger><DialogContent className="bottom-0 top-auto"><DialogTitle>도구함</DialogTitle><Link to="/next">다음 화면</Link></DialogContent>
 </Dialog><ConfirmDialog open={confirm} onOpenChange={setConfirm} title="작성을 그만둘까요?" description="임시 내용" onConfirm={()=>{setConfirm(false);setOpen(false)}}/></>
}
function nativeBack(){act(()=>NativeCloseWatcher.active.at(-1)?.requestClose())}
it('uses one native close watcher and closes the overlay without changing the page',async()=>{
 const before=history.length
 render(<BrowserRouter><Example/></BrowserRouter>)
 fireEvent.click(screen.getByText('도구 열기'))
 expect(NativeCloseWatcher.active).toHaveLength(1)
 expect(history.length).toBe(before)
 nativeBack()
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(location.pathname).toBe('/')
 expect(NativeCloseWatcher.active).toHaveLength(0)
})
it('preserves dirty-editor confirmation and closes only the top layer per back action',async()=>{
 render(<BrowserRouter><Example dirty/></BrowserRouter>)
 fireEvent.click(screen.getByText('도구 열기'));nativeBack()
 await screen.findByRole('alertdialog')
 expect(NativeCloseWatcher.active).toHaveLength(1)
 nativeBack()
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 expect(screen.getByRole('dialog')).toBeTruthy()
 nativeBack()
 expect(await screen.findByRole('alertdialog')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('keeps processing dialogs open without allowing the close request to navigate',async()=>{
 // Open first; then turn on the existing processing guard.
 const view=render(<BrowserRouter><Example/></BrowserRouter>)
 fireEvent.click(screen.getByText('도구 열기'))
 view.rerender(<BrowserRouter><Example busy/></BrowserRouter>)
 nativeBack()
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(NativeCloseWatcher.active).toHaveLength(1)
 view.rerender(<BrowserRouter><Example/></BrowserRouter>)
 nativeBack()
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('also supports uncontrolled trigger dialogs',async()=>{
 render(<Dialog><DialogTrigger>열기</DialogTrigger><DialogContent><DialogTitle>자동 상태</DialogTitle></DialogContent></Dialog>)
 fireEvent.click(screen.getByText('열기'));nativeBack()
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('falls back to a same-page history step and then permits normal route back',async()=>{
 vi.stubGlobal('CloseWatcher',undefined)
 history.replaceState({idx:0,key:'before',usr:null},'','/before')
 history.pushState({idx:1,key:'current',usr:{keep:'state'}},'','/')
 render(<StrictMode><BrowserRouter><OverlayHistoryTracker/><Example/></BrowserRouter></StrictMode>)
 fireEvent.click(screen.getByText('도구 열기'))
 expect(history.state).toMatchObject({idx:1,key:'current',usr:{keep:'state'}})
 await act(async()=>{history.back();await new Promise(resolve=>setTimeout(resolve,30))})
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(location.pathname).toBe('/')
 await act(async()=>{history.back();await new Promise(resolve=>setTimeout(resolve,30))})
 expect(location.pathname).toBe('/before')
})
it('removes the fallback history step after the close button',async()=>{
 vi.stubGlobal('CloseWatcher',undefined)
 history.replaceState({idx:0,key:'before',usr:null},'','/before')
 history.pushState({idx:1,key:'current',usr:null},'','/')
 render(<BrowserRouter><OverlayHistoryTracker/><Example/></BrowserRouter>)
 fireEvent.click(screen.getByText('도구 열기'))
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 await waitFor(()=>expect(history.state?.pongdangOverlay).toBeUndefined())
 await act(async()=>{history.back();await new Promise(resolve=>setTimeout(resolve,30))})
 expect(location.pathname).toBe('/before')
})
it('keeps the fallback guard while a dirty drawer asks for confirmation',async()=>{
 vi.stubGlobal('CloseWatcher',undefined)
 render(<BrowserRouter><OverlayHistoryTracker/><Example dirty/></BrowserRouter>)
 fireEvent.click(screen.getByText('도구 열기'))
 await act(async()=>{history.back();await new Promise(resolve=>setTimeout(resolve,30))})
 await screen.findByRole('alertdialog')
 expect(location.pathname).toBe('/')
 await act(async()=>{history.back();await new Promise(resolve=>setTimeout(resolve,30))})
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(location.pathname).toBe('/')
})
it('does not revive a closed sheet when returning from a link inside it',async()=>{
 vi.stubGlobal('CloseWatcher',undefined)
 render(<BrowserRouter><OverlayHistoryTracker/><Routes><Route path="/" element={<Example/>}/><Route path="/next" element={<p>다음 페이지</p>}/></Routes></BrowserRouter>)
 fireEvent.click(screen.getByText('도구 열기'))
 fireEvent.click(screen.getByText('다음 화면'))
 await screen.findByText('다음 페이지')
 await act(async()=>{history.back();await new Promise(resolve=>setTimeout(resolve,50))})
 expect(location.pathname).toBe('/')
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByText('도구 열기')).toBeTruthy()
})
