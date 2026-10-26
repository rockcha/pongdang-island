import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {writeFileSync,mkdirSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try{
 const page=await browser.newPage({viewport:{width:780,height:960},deviceScaleFactor:1}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5174/artifacts/industrial-trash-review.html')
 await page.waitForTimeout(4000)
 console.log(JSON.stringify({errors,view:await page.evaluate(()=>({url:location.href,body:document.body.innerText.slice(0,800),canvas:document.querySelectorAll('canvas').length,frame:window.__industrialFrame}))}))
 await page.waitForFunction(()=>window.__industrialFrame?.inhabitants.length===3&&window.__industrialFrame.clock>1)
 const before=await page.evaluate(()=>window.__industrialFrame)
 await page.waitForTimeout(1500)
 const after=await page.evaluate(()=>window.__industrialFrame)
 for(const item of after.inhabitants){const previous=before.inhabitants.find(p=>p.id===item.id);if(Math.abs(item.x-previous.x)>.01||Math.abs(item.y-previous.y)>.01||item.frame!==0)throw Error('Fixed trash moved: '+item.id);if(item.y<after.height*.7)throw Error('Trash spawned above floor: '+item.id)}
 if(errors.length)throw Error(errors.join('\n'))
 mkdirSync('artifacts/previews/industrial-trash',{recursive:true})
 await page.screenshot({path:'artifacts/previews/industrial-trash/review.png'})
 writeFileSync('artifacts/industrial-trash-ui.json',JSON.stringify({scope:'Synthetic local aquarium using real renderer and public artwork; no player accounts',before,after,errors},null,2))
 console.log('PASS: all three rendered on the floor and stayed fixed; no browser errors.')
}finally{await browser.close()}
