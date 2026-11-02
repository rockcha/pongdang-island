import {spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join,dirname,basename} from 'node:path'
import {pathToFileURL} from 'node:url'
const refinement=process.argv.includes('--refinement'),expected=refinement?8:39,batch=refinement?'assets/storage-upload/new/20261102-091000':'assets/storage-upload/new/20261102-033000'
const profile=mkdtempSync(join(tmpdir(),'pongdang-hangang-'))
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--disable-gpu','--no-sandbox','--remote-debugging-port=9338',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'})
let socket
try{
 let pages
 for(let attempt=0;attempt<50;attempt++){try{pages=await(await fetch('http://127.0.0.1:9338/json')).json();break}catch{await new Promise(r=>setTimeout(r,100))}}
 if(!pages)throw Error('Preview browser unavailable')
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail})
 let sequence=0;const pending=new Map()
 socket.onmessage=e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result)}}
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})
 await cdp('Page.enable')
 const evidence=[]
 for(const width of [390,1000]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false})
  await cdp('Page.navigate',{url:pathToFileURL(resolve('artifacts/hangang-preview.html')).href})
  await new Promise(r=>setTimeout(r,1600))
  for(const reduced of [false,true])for(const time of reduced?[5]:[0,.7,1.4,2.1,4.2,4.7,5.2,5.7]){
   const r=await cdp('Runtime.evaluate',{expression:`(async()=>{window.playing=false;return await window.renderAt(${time},${reduced})})()`,awaitPromise:true,returnByValue:true})
   if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails))
   const state=r.result.value
   if(state.count!==expected||state.width>width+1)throw Error(JSON.stringify({time,width,state}))
   evidence.push({width,time,reduced,...state})
  }
  await cdp('Runtime.evaluate',{expression:'window.renderAt(5.2,false)' ,awaitPromise:true})
  const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
  writeFileSync(`artifacts/hangang-preview-${width}.png`,Buffer.from(shot.data,'base64'))
  if(refinement&&width===1000)for(const time of [1.9,4.8,5.45]){
   await cdp('Runtime.evaluate',{expression:`window.renderAt(${time},false)`,awaitPromise:true})
   const phaseShot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
   writeFileSync(`artifacts/hangang-refinement-phase-${time}.png`,Buffer.from(phaseShot.data,'base64'))
  }
 }
 writeFileSync(batch+'/runtime-review.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:'Actual runtime frame/layout/effect helpers and local final PNGs; desktop/mobile review harness, not authenticated production gameplay',evidence},null,2)+'\n')
 console.log('PASS: '+expected+' decoded animated sprites at 390/1000px, all eight mythic poses, six-second runtime and reduced motion')
}finally{
 socket?.close();browser.kill();await new Promise(r=>setTimeout(r,500))
 if(dirname(profile)!==resolve(tmpdir())||!basename(profile).startsWith('pongdang-hangang-'))throw Error('Unexpected preview profile path')
 try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch{}
}
