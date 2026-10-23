// @vitest-environment node
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {expect,it,vi} from 'vitest'
function setup(account='owner'){
 const listeners={},showNotification=vi.fn(),navigate=vi.fn(),focus=vi.fn(),openWindow=vi.fn()
 const scope={URL,Promise,self:{location:{origin:'https://pongdang.test'},addEventListener:(name,fn)=>{listeners[name]=fn},registration:{showNotification,getNotifications:async()=>[]},clients:{matchAll:async()=>[{url:'https://pongdang.test/aquarium',navigate,focus}],openWindow}}}
 const context=vm.createContext(scope)
 vm.runInContext(readFileSync('public/push-worker.js','utf8'),context)
 context.binding=async()=>account
 const send=async(name,event)=>{let pending;listeners[name]({...event,waitUntil:value=>{pending=value}});await pending}
 return {showNotification,navigate,focus,openWindow,send}
}
it('shows a matching-account notification with mascot and monochrome badge',async()=>{
 const app=setup()
 await app.send('push',{data:{json:()=>({userId:'owner',title:'미끼 완성',body:'받아주세요',url:'/bait-production',tag:'notice:1'})}})
 expect(app.showNotification).toHaveBeenCalledWith('미끼 완성',expect.objectContaining({icon:'/branding/pongi.png',badge:'/notification-icons/push-badge.png',tag:'notice:1',renotify:false,data:{url:'/bait-production',userId:'owner'}}))
})
it('does not show another account notification or malformed payload',async()=>{
 const app=setup()
 await app.send('push',{data:{json:()=>({userId:'other',title:'private'})}})
 await app.send('push',{data:{json:()=>{throw Error('invalid')}}})
 expect(app.showNotification).not.toHaveBeenCalled()
})
it('restricts click targets and reuses an existing same-origin window',async()=>{
 const app=setup(),close=vi.fn()
 await app.send('notificationclick',{notification:{close,data:{userId:'owner',url:'https://evil.test/'}}})
 expect(close).toHaveBeenCalled();expect(app.navigate).toHaveBeenCalledWith('https://pongdang.test/settings')
 expect(app.focus).toHaveBeenCalled();expect(app.openWindow).not.toHaveBeenCalled()
})
it('does not reopen another account notification after logout',async()=>{
 const app=setup('new-account')
 await app.send('notificationclick',{notification:{close:vi.fn(),data:{userId:'owner',url:'/port'}}})
 expect(app.navigate).not.toHaveBeenCalled();expect(app.openWindow).not.toHaveBeenCalled()
})
it('suppresses expiry reminders delivered after the storage deadline',async()=>{
 const app=setup()
 await app.send('push',{data:{json:()=>({userId:'owner',expiresAt:new Date(Date.now()-1000).toISOString()})}})
 expect(app.showNotification).not.toHaveBeenCalled()
 await app.send('push',{data:{json:()=>({userId:'owner',expiresAt:new Date(Date.now()+60000).toISOString()})}})
 expect(app.showNotification).toHaveBeenCalledOnce()
})
