import {spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync,readFileSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join,dirname,basename} from 'node:path'
import {pathToFileURL} from 'node:url'
const profile=mkdtempSync(join(tmpdir(),'pongdang-exploration-'))
const browser=spawn(process.env.EXPLORATION_BROWSER??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'})
let socket
try{
 let pages
 for(let attempt=0;attempt<40;attempt++){try{const port=readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0].trim();pages=await (await fetch('http://127.0.0.1:'+port+'/json')).json();break}catch{await new Promise(r=>setTimeout(r,100))}}
 if(!pages)throw Error('Browser did not start')
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject})
 let sequence=0;const pending=new Map()
 socket.onmessage=event=>{const result=JSON.parse(event.data);if(result.id){const entry=pending.get(result.id);pending.delete(result.id);result.error?entry.reject(Error(JSON.stringify(result.error))):entry.resolve(result.result)}}
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})
 await cdp('Page.enable')
 const assetsDir=resolve(process.env.EXPLORATION_BUILD_DIR??'dist','assets')
 const manifest=JSON.parse(readFileSync(join(dirname(assetsDir),'.vite/manifest.json'),'utf8'))
 const styleFiles=[...(manifest['index.html']?.css??[]),...(manifest['src/features/exploration/exploration-page.tsx']?.css??[])]
 const styles=styleFiles.map(file=>`<link rel="stylesheet" href="${pathToFileURL(resolve(dirname(assetsDir),file)).href}">`).join('')
 const scenes=process.env.EXPLORATION_PREVIEW_SCENES?.split(',')??['doors','rest','boss','inventory','complete','stairs','encounter','chest-combat','shaman','shaman-shop','merchant','merchant-shop']
 const viewports=process.env.EXPLORATION_PREVIEW_VIEWPORTS?.split(',').map(size=>{const [width,height]=size.split('x').map(Number);if(!width||!height)throw Error('Invalid viewport');return {width,height}})??[320,390,1000].map(width=>({width,height:width===320?640:844}))
 const metricsLog=[]
 for(const {width,height} of viewports)for(const scene of scenes){
  const preview=resolve(`artifacts/verified-exploration-${scene}.html`)
  writeFileSync(preview,readFileSync(preview,'utf8').replace(/<link rel="stylesheet"[^>]*>/g,'').replace('<style>',styles+'<style>'))
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600})
  await cdp('Page.navigate',{url:pathToFileURL(preview).href})
  await new Promise(r=>setTimeout(r,400))
  const metrics=await cdp('Runtime.evaluate',{expression:`JSON.stringify({arenaBackground:document.querySelector('.exploration-combat')?getComputedStyle(document.querySelector('.exploration-combat')).backgroundImage:null,viewport:innerWidth,width:document.documentElement.scrollWidth,game:document.querySelector('.exploration-game')?.getBoundingClientRect().width,broken:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)})`,returnByValue:true})
  const state=JSON.parse(metrics.result.value)
  if(scene==='chest-combat'&&!state.arenaBackground?.includes('chest.webp'))throw Error('Chest encounter background was lost')
  if(state.width>width+1||state.broken.length)throw Error(JSON.stringify({scene,width,...state}))
  const layout=await cdp('Runtime.evaluate',{expression:`JSON.stringify({stairs:(()=>{const el=document.querySelector('.exploration-descent-sprite');if(!el)return null;const r=el.getBoundingClientRect();return {width:r.width,height:r.height}})(),spells:Array.from(document.querySelectorAll('.exploration-shop-weapon')).map(el=>el.getBoundingClientRect().width)})`,returnByValue:true})
  const dimensions=JSON.parse(layout.result.value)
  const combat=await cdp('Runtime.evaluate',{expression:`JSON.stringify(Object.fromEntries(Object.entries({image:'.exploration-enemy-art>img',stage:'.exploration-monster-stage',hud:'.exploration-top',enemy:'.exploration-enemy-status',controls:'.exploration-combat-controls',dock:'.exploration-equipment-dock'}).map(([name,selector])=>{const element=document.querySelector(selector),r=element?.getBoundingClientRect();return [name,r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}:null]})))`,returnByValue:true})
  metricsLog.push({scene,width,height,...JSON.parse(combat.result.value)})
  if(scene==='stairs'&&(!dimensions.stairs||dimensions.stairs.width<50||dimensions.stairs.height<50))throw Error('Stairs are not visible on '+width)
  if(['shaman-shop','merchant-shop'].includes(scene)&&dimensions.spells.some(size=>size>56))throw Error('Oversized spell artwork on '+width)

  const screenshot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
  writeFileSync(`artifacts/verified-exploration-${scene}-${width}${height!==(width===320?640:844)?'x'+height:''}.png`,Buffer.from(screenshot.data,'base64'))
 }
 const label=process.env.EXPLORATION_PREVIEW_LABEL??'latest'
 if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid metrics label')
 writeFileSync(`artifacts/exploration-preview-${label}.json`,JSON.stringify(metricsLog,null,2))
 console.log('PASS: '+scenes.length+' exploration scenes at '+viewports.map(view=>view.width+'x'+view.height).join(', '))
}finally{
 socket?.close();browser.kill()
 await new Promise(r=>setTimeout(r,500))
 if(dirname(profile)!==resolve(tmpdir())||!basename(profile).startsWith('pongdang-exploration-'))throw Error('Unexpected preview profile directory')
 try{rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100})}catch{/* The browser can briefly retain file handles after exit. */}
}
