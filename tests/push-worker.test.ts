// @vitest-environment node
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {expect,it,vi} from 'vitest'
import {MessageChannel} from 'node:worker_threads'
function setup(account='owner',options:{windows?:unknown[];notices?:unknown[];userAgent?:string}={}){
 const listeners={},showNotification=vi.fn(),navigate=vi.fn(),focus=vi.fn(),openWindow=vi.fn()
 const scope={URL,Promise,MessageChannel,setTimeout,clearTimeout,importScripts:()=>{},self:{navigator:{userAgent:options.userAgent??'Chrome/140'},location:{origin:'https://pongdang.test'},addEventListener:(name,fn)=>{listeners[name]=fn},registration:{showNotification,getNotifications:async()=>options.notices??[]},clients:{matchAll:async()=>options.windows??[{url:'https://pongdang.test/aquarium',navigate,focus}],openWindow}}}
 const context=vm.createContext(scope)
 vm.runInContext(readFileSync('public/push-presentation.js','utf8'),context)
 vm.runInContext(readFileSync('public/push-worker.js','utf8'),context)
 context.binding=async()=>account
 const send=async(name,event)=>{let pending;listeners[name]({...event,waitUntil:value=>{pending=value}});await pending}
 return {showNotification,navigate,focus,openWindow,send}
}
it('shows a matching-account notification with mascot and monochrome badge',async()=>{
 const app=setup()
 await app.send('push',{data:{json:()=>({userId:'owner',title:'미끼 완성',body:'받아주세요',url:'/bait-production',tag:'notice:1'})}})
 expect(app.showNotification).toHaveBeenCalledWith('미끼 완성',expect.objectContaining({icon:'/branding/pongi.png',badge:'/notification-icons/push-badge-pongi-v1.png',tag:'notice:1',renotify:false,data:expect.objectContaining({url:'/bait-production',userId:'owner'})}))
})
it('uses the visible page only after it acknowledges displaying the card',async()=>{
 const postMessage=vi.fn((message,ports)=>{ports[0].postMessage({shown:true});ports[0].close()})
 const app=setup('owner',{windows:[{visibilityState:'visible',postMessage}]})
 await app.send('push',{data:{json:()=>({userId:'owner',title:'準備',body:'完成',url:'/production',tag:'notice:1'})}})
 expect(postMessage).toHaveBeenCalledOnce();expect(app.showNotification).not.toHaveBeenCalled()
})
it('still shows a system notification when the app is minimized',async()=>{
 const postMessage=vi.fn(),app=setup('owner',{windows:[{visibilityState:'hidden',postMessage}]})
 await app.send('push',{data:{json:()=>({userId:'owner',title:'완료',url:'/production',tag:'notice:1'})}})
 expect(postMessage).not.toHaveBeenCalled();expect(app.showNotification).toHaveBeenCalledOnce()
})
it('preserves WebKit system notifications even when a foreground card is acknowledged',async()=>{
 const postMessage=vi.fn((message,ports)=>{ports[0].postMessage({shown:true});ports[0].close()})
 const app=setup('owner',{userAgent:'Version/18.0 Safari/605.1.15',windows:[{visibilityState:'visible',postMessage}]})
 await app.send('push',{data:{json:()=>({userId:'owner',title:'Ready',url:'/production',tag:'notice:1'})}})
 expect(postMessage).toHaveBeenCalledOnce();expect(app.showNotification).toHaveBeenCalledOnce()
})
it('falls back to the system when a visible page rejects the message',async()=>{
 const app=setup('owner',{windows:[{visibilityState:'visible',postMessage:(message,ports)=>{ports[0].postMessage({shown:false});ports[0].close()}}]})
 await app.send('push',{data:{json:()=>({userId:'owner',title:'완료',url:'/production',tag:'notice:1'})}})
 expect(app.showNotification).toHaveBeenCalledOnce()
})
it('closes claimed notices and rebuilds partially claimed groups without touching newer arrivals',async()=>{
 const a={tag:'notice:1',title:'완료',body:'연료 10개',quantity:10},b={...a,tag:'notice:2',quantity:20}
 const payload={userId:'owner',category:'production',title:'완료',body:'준비',url:'/production',tag:'group',members:[a,b]}
 const closed=vi.fn(),freshClosed=vi.fn()
 const app=setup('owner',{notices:[{data:{userId:'owner',payload,receivedAt:1},close:closed},{data:{userId:'owner',payload,receivedAt:30},close:freshClosed}]})
 await app.send('message',{data:{type:'PUSHDATA_RECONCILE',userId:'owner',active:[b],observedBefore:20}})
 expect(app.showNotification).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({body:b.body}))
 expect(freshClosed).not.toHaveBeenCalled()
 await app.send('message',{data:{type:'PUSHDATA_RECONCILE',userId:'owner',active:[],observedBefore:20}})
 expect(closed).toHaveBeenCalledOnce();expect(freshClosed).not.toHaveBeenCalled()
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
