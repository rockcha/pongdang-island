import {spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync,readFileSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join,dirname,basename} from 'node:path'
import {pathToFileURL} from 'node:url'
const profile=mkdtempSync(join(tmpdir(),'pongdang-exploration-'))
const browser=spawn(process.env.EXPLORATION_BROWSER??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--disable-gpu','--no-sandbox','--remote-debugging-port=9337',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'})
let socket
try{
 let pages
 for(let attempt=0;attempt<40;attempt++){try{pages=await (await fetch('http://127.0.0.1:9337/json')).json();break}catch{await new Promise(r=>setTimeout(r,100))}}
 if(!pages)throw Error('Browser did not start')
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject})
 let sequence=0;const pending=new Map()
 socket.onmessage=event=>{const result=JSON.parse(event.data);if(result.id){const entry=pending.get(result.id);pending.delete(result.id);result.error?entry.reject(Error(JSON.stringify(result.error))):entry.resolve(result.result)}}
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})
 await cdp('Page.enable')
 const styles=readdirSync('dist/assets').filter(file=>/^(index|exploration-page)-.*\.css$/.test(file)).map(file=>`<link rel="stylesheet" href="${pathToFileURL(resolve('dist/assets',file)).href}">`).join('')
 for(const width of [320,390,1000])for(const scene of ['doors','rest','boss','inventory','complete']){
  const preview=resolve(`artifacts/verified-exploration-${scene}.html`)
  writeFileSync(preview,readFileSync(preview,'utf8').replace(/<link rel="stylesheet"[^>]*>/g,'').replace('<style>',styles+'<style>'))
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false})
  await cdp('Page.navigate',{url:pathToFileURL(preview).href})
  await new Promise(r=>setTimeout(r,400))
  const metrics=await cdp('Runtime.evaluate',{expression:`JSON.stringify({viewport:innerWidth,width:document.documentElement.scrollWidth,game:document.querySelector('.exploration-game')?.getBoundingClientRect().width,broken:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)})`,returnByValue:true})
  const state=JSON.parse(metrics.result.value)
  if(state.width>width+1||state.broken.length)throw Error(JSON.stringify({scene,width,...state}))
  const screenshot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
  writeFileSync(`artifacts/verified-exploration-${scene}-${width}.png`,Buffer.from(screenshot.data,'base64'))
 }
 console.log('PASS: exploration doors, room, boss, inventory and completion at 320, 390 and 1000 px')
}finally{
 socket?.close();browser.kill()
 await new Promise(r=>setTimeout(r,500))
 if(dirname(profile)!==resolve(tmpdir())||!basename(profile).startsWith('pongdang-exploration-'))throw Error('Unexpected preview profile directory')
 try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch{/* The browser can briefly retain file handles after exit. */}
}
