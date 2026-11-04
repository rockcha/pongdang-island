import {spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync,readFileSync,existsSync} from 'node:fs'
import {createServer} from 'node:http'
import {tmpdir} from 'node:os'
import {resolve,join,dirname,basename} from 'node:path'
import {pathToFileURL} from 'node:url'
const integration=process.argv.includes('--integration'),scene=process.argv.includes('--scenes'),refinement=false,effects=false,expected=process.argv.includes('--partial')?5:42,batch='assets/storage-upload/new/20261105-033000'
let server
if(integration){
 server=createServer((req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
  if(p.includes('..')||p.includes('\\')||!(/^\/artifacts\/galaxy-integration[^/]*\.(html|js)$/.test(p)||p.startsWith('/'+batch+'/')||p.startsWith('/aquarium/swim/galaxy-'))){res.writeHead(404);res.end();return}
  const file=resolve(p.startsWith('/aquarium/')?'public'+p:p.slice(1))
  if(!existsSync(file)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html; charset=utf-8':'image/png');res.end(readFileSync(file))
 })
 await new Promise(r=>server.listen(9458,'127.0.0.1',r))
}
const profile=mkdtempSync(join(tmpdir(),'pongdang-galaxy-'))
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--disable-gpu','--no-sandbox','--remote-debugging-port=9348',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'})
let socket
try{
 let pages
 for(let attempt=0;attempt<50;attempt++){try{pages=await(await fetch('http://127.0.0.1:9348/json')).json();break}catch{await new Promise(r=>setTimeout(r,100))}}
 if(!pages)throw Error('Preview browser unavailable')
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail})
 let sequence=0;const pending=new Map()
 socket.onmessage=e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result)}}
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})
 await cdp('Page.enable')
 const evidence=[]
 for(const width of [390,1000]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:width===390?2:1,mobile:false})
  await cdp('Page.navigate',{url:integration?'http://127.0.0.1:9458/artifacts/galaxy-integration.html':pathToFileURL(resolve(scene?'artifacts/galaxy-scenes.html':'artifacts/galaxy-preview.html')).href})
  await new Promise(r=>setTimeout(r,1600))
  if(integration){
   for(let sample=0;sample<4;sample++){
    await new Promise(r=>setTimeout(r,2000))
    const r=await cdp('Runtime.evaluate',{expression:'window.reviewState()',returnByValue:true}),state=r.result.value
    if(r.exceptionDetails||!state||state.errors.length||state.stats[0].count!==7||state.stats[1].count!==35||state.previews!==7||state.busy||state.width>width+1)throw Error(JSON.stringify({exception:r.exceptionDetails,state}))
    evidence.push({width,sample,...state})
   }
   const painted=await cdp('Runtime.evaluate',{expression:`(async()=>{const list=[...document.querySelectorAll('#previews canvas')];for(const c of list){c.scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,350));}return list.map(c=>({painted:c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)}))})()`,awaitPromise:true,returnByValue:true})
   if(painted.exceptionDetails||painted.result.value.some(c=>!c.painted))throw Error(JSON.stringify(painted))
   evidence.push({width,painted:painted.result.value})
   const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
   writeFileSync(`artifacts/galaxy-integration-${width}.png`,Buffer.from(shot.data,'base64'))
   await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
   await cdp('Runtime.evaluate',{expression:'window.tanks.forEach(t=>t.setReduced(true))'})
   await new Promise(r=>setTimeout(r,400))
   const reducedShot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
   writeFileSync(`artifacts/galaxy-integration-reduced-${width}.png`,Buffer.from(reducedShot.data,'base64'))
   await cdp('Emulation.setEmulatedMedia',{features:[]})
   continue
  }
  if(scene){
   const r=await cdp('Runtime.evaluate',{expression:`({width:document.documentElement.scrollWidth,images:[...document.querySelectorAll('img')].map(i=>({loaded:i.complete&&i.naturalWidth>0})),layers:[...document.querySelectorAll('svg image')].map(i=>({opacity:i.getAttribute('opacity'),href:i.getAttribute('href')}))})`,returnByValue:true})
   const state=r.result.value
   if(state.width>width+1||state.images.length!==3||state.images.some(i=>!i.loaded)||state.layers.length!==3||state.layers.some(i=>i.opacity==='0'))throw Error(JSON.stringify(state))
   evidence.push({width,...state})
   const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
   writeFileSync(`artifacts/galaxy-scenes-${width}.png`,Buffer.from(shot.data,'base64'))
   continue
  }
  for(const reduced of [false,true])for(const time of reduced?[5]:effects?[0,2,4.5,5.2,8,10,12,18,25,32,39,46,50,51]:[0,.7,1.4,2.1,4.2,4.7,5.2,5.7]){
   const r=await cdp('Runtime.evaluate',{expression:`(async()=>{window.playing=false;return await window.renderAt(${time},${reduced})})()`,awaitPromise:true,returnByValue:true})
   if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails))
   const state=r.result.value
   if(state.count!==expected||state.width>width+1)throw Error(JSON.stringify({time,width,state}))
   evidence.push({width,time,reduced,...state})
  }
  await cdp('Runtime.evaluate',{expression:'window.renderAt(5.2,false)' ,awaitPromise:true})
  const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
  writeFileSync(`artifacts/galaxy-preview-${width}.png`,Buffer.from(shot.data,'base64'))
  if(refinement&&width===1000)for(const time of effects?[5.2,10,18,25,32,39,46]:[1.9,4.8,5.45]){
   await cdp('Runtime.evaluate',{expression:`window.renderAt(${time},false)`,awaitPromise:true})
   const phaseShot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
   writeFileSync(`artifacts/galaxy-refinement-phase-${time}.png`,Buffer.from(phaseShot.data,'base64'))
  }
  if(effects||process.argv.includes('--light')){
   await cdp('Runtime.evaluate',{expression:"document.querySelectorAll('.card').forEach(c=>{c.style.background='#fff8ee';c.style.color='#4c3b2e'});window.renderAt(32,false)",awaitPromise:true})
   const light=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})
   writeFileSync(`artifacts/galaxy-effects-light-${width}.png`,Buffer.from(light.data,'base64'))
  }
 }
 writeFileSync(integration?batch+'/integration-review.json':scene?batch+'/scene-review.json':effects?'artifacts/galaxy-effects-runtime-review.json':batch+'/runtime-review.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:integration?'Actual Phaser aquarium (42 species) and collection preview (7 mythics), local asset URLs and fixture inventory; no authenticated account writes':scene?'Actual fishing scene components and local theme PNGs; not authenticated production gameplay':'Actual runtime frame/layout/effect helpers and local final PNGs; desktop/mobile review harness, not authenticated production gameplay',evidence},null,2)+'\n')
 console.log(integration?'PASS: actual aquarium and collection preview loaded at 390/1000px; inspect screenshots':scene?'PASS: fishing scene layers and three themes loaded at 390/1000px; inspect screenshots':'PASS: '+expected+' decoded animated sprites at 390/1000px, sampled six-second loop and reduced motion; inspect screenshots for visual quality')
}finally{
 socket?.close();browser.kill();server?.close();await new Promise(r=>setTimeout(r,500))
 if(dirname(profile)!==resolve(tmpdir())||!basename(profile).startsWith('pongdang-galaxy-'))throw Error('Unexpected preview profile path')
 try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch{}
}
