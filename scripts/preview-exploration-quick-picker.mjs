import {spawn} from 'node:child_process'
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join} from 'node:path'
import {pathToFileURL} from 'node:url'
const profileRoot=resolve('.cache');
mkdirSync(profileRoot,{recursive:true});
writeFileSync(join(profileRoot,'quick-picker-preview.html'),"<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body style=\"margin:0\"><div id=\"quick-root\"></div><script type=\"module\" src=\"/.cache/quick-picker-preview.tsx\"></script></body></html>");
writeFileSync(join(profileRoot,'quick-picker-preview.tsx'),"\nimport React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport {ScorpionRoom} from '/src/features/exploration/scorpion-room';\nimport {newLocalGrowthModel} from '/src/features/exploration/local-growth-model';\nimport {startScorpionCombat} from '/src/features/exploration/combat-state';\nimport {practiceSpells} from '/src/features/exploration/practice-state';\nimport '/src/index.css';\nimport '/src/features/exploration/exploration.css';\nimport '/src/features/exploration/exploration-hud.css';\nimport '/src/features/exploration/exploration-combat.css';\nimport '/src/features/exploration/exploration-header.css';\nimport '/src/features/exploration/exploration-desktop.css';\nimport '/src/features/exploration/verified-exploration.css';\nconst initial=newLocalGrowthModel().state;\ninitial.spells.push(practiceSpells[0]);initial.equippedSpells.push(practiceSpells[0].id);\nconst state=startScorpionCombat({...initial,hp:55,mp:12,potions:{health:3,mana:2}});state.combat.turn=1;\ncreateRoot(document.getElementById('quick-root')).render(<section className=\"exploration-game is-practice is-verified\"><header className=\"exploration-top\" style={{height:80}}>Combat preview</header><main className=\"exploration-scene has-dungeon-art is-close-scene\"><ScorpionRoom state={state} busy={false} feedback={null} latestLog=\"Choose an action\" speaker=\"Test\" onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}}/></main><section className=\"exploration-equipment-dock\" style={{height:72}}>Loadout</section></section>);\n");
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

 const metrics=[];
 for(const width of [320,390,1000]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});
  await cdp('Page.navigate',{url:'http://localhost:5173/.cache/quick-picker-preview.html'});
  const evaluate=async expression=>(await cdp('Runtime.evaluate',{expression,returnByValue:true})).result.value;
  let ready=false;
  for(let i=0;i<80;i++){if(await evaluate('!!document.querySelector(".combat-action-magic")')){ready=true;break;}await new Promise(r=>setTimeout(r,200));}
  if(!ready)throw Error('Local preview did not render');
  for(const kind of ['magic','potion']){
   await evaluate('document.querySelector(".combat-action-'+kind+'").click()');
   await new Promise(r=>setTimeout(r,400));
   let imagesReady=false;
   for(let i=0;i<30;i++){if(await evaluate('Array.from(document.querySelectorAll(".combat-quick-picker img")).every(img=>img.complete&&img.naturalWidth>0)')){imagesReady=true;break;}await new Promise(r=>setTimeout(r,100));}
   if(!imagesReady)throw Error('Quick picker image failed to load: '+kind);
   const result=JSON.parse(await evaluate('JSON.stringify((()=>{const popup=document.querySelector(".combat-quick-picker"),trigger=document.querySelector(".combat-action-'+kind+'"),p=popup?.getBoundingClientRect(),t=trigger.getBoundingClientRect();return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,popup:p?{x:p.x,y:p.y,width:p.width,height:p.height,bottom:p.bottom}:null,triggerTop:t.top,modalBackdrop:!!document.querySelector("[data-slot=dialog-overlay]")}})())'));
   metrics.push({kind,...result});
   if(!result.popup||result.popup.x<0||result.popup.x+result.popup.width>width||result.popup.bottom>result.triggerTop||result.modalBackdrop)throw Error('Quick picker placement failed '+JSON.stringify(result));
   const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   writeFileSync('artifacts/exploration-quick-'+kind+'-'+width+'.png',Buffer.from(shot.data,'base64'));
   await evaluate('document.querySelector(".combat-action-'+kind+'").click()');await new Promise(r=>setTimeout(r,100));
  }
 }
 writeFileSync('artifacts/exploration-quick-layout.json',JSON.stringify(metrics,null,2));
 console.log('PASS: live magic and potion quick pickers above their buttons at 320, 390, 1000px');
}finally{socket?.close();browser.kill()}
