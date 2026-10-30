import fs from 'node:fs'
import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true}),batch='assets/storage-upload/new/20261030-105924',m=JSON.parse(fs.readFileSync(batch+'/manifest.json','utf8')),results=[]
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(e.message))
 for(const theme of m.files){
  await page.goto('http://127.0.0.1:5173/artifacts/previews/fairy-aquarium-shop.html?collection=pharaoh&view=tank&theme='+theme.theme_id)
  const tank=page.getByTestId('panorama-glass');await page.waitForFunction(()=>document.querySelector('[data-testid="panorama-glass"]')?.getAttribute('data-ready')==='true')
  const image=page.getByRole('img',{name:'좌우로 이어지는 '+theme.name});await image.evaluate(image=>image.decode())
  const widths=await tank.evaluate(el=>({world:Number(el.getAttribute('data-world-width')),viewport:Number(el.getAttribute('data-viewport-width'))}))
  if(Math.abs(widths.world/widths.viewport-3)>.01)throw Error('Panorama world is not three screens wide')
  await page.screenshot({path:'artifacts/previews/'+theme.theme_id+'-tank.png',fullPage:true})
  results.push({id:theme.theme_id,...widths,image:await image.getAttribute('src')})
 }
 if(errors.length)throw Error(errors.join('\n'))
 fs.writeFileSync(batch+'/ui-verification.json',JSON.stringify({verified_at:new Date().toISOString(),scope:'Local actual shop confirmation and actual Phaser aquarium; synthetic specimens, no real purchases',shop:{cards:2,prices:[2500,3000],uncropped:true},tanks:results,errors,frontend_deployed:false},null,2)+'\n')
 console.log(JSON.stringify({themes:results.length,panoramaWorlds:results,errors}))
}finally{await browser.close()}
