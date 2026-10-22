import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync} from 'node:fs'
const root='assets/storage-upload/new/20261022-101350'
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader']})
try{
 const page=await browser.newPage({viewport:{width:1060,height:850},deviceScaleFactor:1})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/storage/v1/object/public/collectibles/**',async route=>{
  const key=decodeURIComponent(new URL(route.request().url()).pathname.split('/collectibles/')[1])
  if(!manifest.entries.some(e=>[e.storage_path,e.thumbnail_path].includes(key)))throw Error('Unexpected asset '+key)
  await route.fulfill({body:readFileSync(root+'/'+key),contentType:'image/png',headers:{'access-control-allow-origin':'*'}})
 })
 await page.goto('http://127.0.0.1:5173/artifacts/previews/common-fuel-materials.html')
 await page.waitForFunction(()=>document.querySelectorAll('section img').length===10&&[...document.querySelectorAll('section img')].every(img=>img.complete&&img.naturalWidth>0))
 await page.waitForSelector('canvas')
 await page.waitForTimeout(5000)
 if(errors.length)throw Error(errors.join('\n'))
 if(await page.getByRole('alert').count())throw Error('Tank renderer reported an error')
 await page.screenshot({path:'artifacts/previews/common-fuel-materials.png',fullPage:true})
 console.log('PASS: ten loaded thumbnails, actual WebGL tank canvas, no runtime errors')
}finally{await browser.close()}
