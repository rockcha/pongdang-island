import {spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join,dirname} from 'node:path'
import {pathToFileURL} from 'node:url'
const profileRoot=resolve('.cache');
if(!readdirSync('.').includes('.cache'))throw Error('Missing cache directory');
const profile=mkdtempSync(join(profileRoot,'growth-preview-'))
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
 const styleFiles=[],seen=new Set()
 const collect=key=>{if(seen.has(key))return;seen.add(key);for(const child of manifest[key]?.imports??[])collect(child);for(const css of manifest[key]?.css??[])if(!styleFiles.includes(css))styleFiles.push(css)}
 collect('index.html');collect('src/features/exploration/exploration-page.tsx')
 const styles=styleFiles.map(file=>`<link rel="stylesheet" href="${pathToFileURL(resolve(dirname(assetsDir),file)).href}">`).join('')+'<style>'+readFileSync('src/features/exploration/growth.css','utf8')+'</style>'

 const metrics=[];
 for(const width of [320,390,1000])for(const scene of ['page','modal','upgraded','play']){
  const path=resolve('artifacts/exploration-growth-'+scene+'.html');
  let html=readFileSync(path,'utf8').replace(/<link rel="stylesheet"[^>]*>/g,'').replace(/ data-starting-style=""/g,'');
  html=html.replace('</head>',styles+'<style>html,body{margin:0;min-height:100%;}body{background:#fff8ee}</style></head>');
  writeFileSync(path,html);
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
  await cdp('Page.navigate',{url:pathToFileURL(path).href});
  await new Promise(r=>setTimeout(r,500));
  const result=await cdp('Runtime.evaluate',{expression:`JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,dialog:(()=>{const r=document.querySelector('[role="dialog"]')?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null})()})`,returnByValue:true});
  const size=JSON.parse(result.result.value);metrics.push({scene,...size});
  if(size.scrollWidth>width+1)throw Error('Horizontal overflow '+scene+' '+width);
  if(scene==='modal'&&(!size.dialog||size.dialog.x<0||size.dialog.y<0||size.dialog.width>width||size.dialog.y+size.dialog.height>844))throw Error('Modal outside viewport '+width);
  const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/exploration-growth-'+scene+'-'+width+'.png',Buffer.from(shot.data,'base64'));
 }
 writeFileSync('artifacts/exploration-growth-layout.json',JSON.stringify(metrics,null,2));
 console.log('PASS: growth preview and modal at 320, 390 and 1000px');
}finally{socket?.close();browser.kill()}
