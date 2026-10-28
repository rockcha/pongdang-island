import {readFileSync} from 'node:fs'
import {JSDOM} from 'jsdom'
import {afterEach,expect,it,vi} from 'vitest'

const html=readFileSync('index.html','utf8')
const script=html.match(/<script id="app-startup-script">([\s\S]*?)<\/script>/)![1]
const windows:JSDOM[]=[]
function start(){
 const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only'})
 windows.push(dom);dom.window.eval(script)
 return dom.window
}
afterEach(()=>{windows.splice(0).forEach(dom=>dom.window.close())})

it('provides recovery when the entry module fails without React running',()=>{
 const win=start()
 win.localStorage.setItem('login','keep-me')
 win.dispatchEvent(new win.ErrorEvent('error',{filename:'https://example.test/assets/index-old.js?token=secret'}))
 expect(win.document.getElementById('app-startup')!.hidden).toBe(false)
 expect(win.document.getElementById('app-startup-retry')!.hidden).toBe(false)
 expect(win.document.getElementById('app-startup-title')!.textContent).toBe('좀 문제가 생겼어요.')
 expect(win.document.getElementById('app-startup-image')!.getAttribute('src')).toBe('/branding/pongi-startup-error.png')
 const record=JSON.parse(win.sessionStorage.getItem('pongdang:last-startup-error')!)
 expect(record.file).toBe('index-old.js')
 expect(JSON.stringify(record)).not.toContain('secret')
 expect(win.localStorage.getItem('login')).toBe('keep-me')
})

it('hides after mounting but recovers a later chunk load failure',()=>{
 const win=start()
 win.eval('window.pongdangStartup.ready()')
 expect(win.document.getElementById('app-startup')!.hidden).toBe(true)
 win.dispatchEvent(new win.Event('vite:preloadError'))
 expect(win.document.getElementById('app-startup')!.hidden).toBe(false)
 expect(win.document.getElementById('app-startup-title')!.textContent).toBe('좀 문제가 생겼어요.')
})

it('works when storage is unavailable',()=>{
 const win=start()
 Object.defineProperty(win,'sessionStorage',{get(){throw new Error('blocked')}})
 expect(()=>win.eval('window.pongdangStartup.fail("render-error")')).not.toThrow()
 expect(win.document.getElementById('app-startup-retry')!.hidden).toBe(false)
})

it('preserves offline files when the connectivity check fails',async()=>{
 const win=start(),unregister=vi.fn(),remove=vi.fn()
 Object.assign(win,{fetch:vi.fn().mockRejectedValue(new Error('offline')),caches:{keys:vi.fn(),delete:remove}})
 Object.defineProperty(win.navigator,'serviceWorker',{value:{getRegistration:vi.fn().mockResolvedValue({scope:'https://example.test/',unregister})}})
 win.document.getElementById('app-startup-repair')!.click()
 await vi.waitFor(()=>expect(win.document.getElementById('app-startup-detail')!.textContent).toContain('복구하지 못했어요'))
 expect(unregister).not.toHaveBeenCalled()
 expect(remove).not.toHaveBeenCalled()
})

it('repairs only this app’s Workbox precache while preserving login data',async()=>{
 const win=start(),unregister=vi.fn().mockResolvedValue(true),remove=vi.fn().mockResolvedValue(true)
 win.localStorage.setItem('login','keep-me')
 Object.assign(win,{
  fetch:vi.fn().mockResolvedValue({ok:true,headers:{get:()=> 'text/html'}}),
  caches:{keys:vi.fn().mockResolvedValue(['workbox-precache-v2-https://example.test/','workbox-precache-v2-https://example.test/other/','music-cache']),delete:remove},
 })
 Object.defineProperty(win.navigator,'serviceWorker',{value:{getRegistration:vi.fn().mockResolvedValue({scope:'https://example.test/',unregister})}})
 win.document.getElementById('app-startup-repair')!.click()
 await vi.waitFor(()=>expect(remove).toHaveBeenCalledOnce())
 expect(remove).toHaveBeenCalledWith('workbox-precache-v2-https://example.test/')
 expect(unregister).toHaveBeenCalledOnce()
 expect(win.localStorage.getItem('login')).toBe('keep-me')
})
