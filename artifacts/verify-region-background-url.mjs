import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true})
try{
 const page=await browser.newPage()
 await page.goto('http://127.0.0.1:5173/artifacts/previews/pharaoh/environment.html')
 const result=await page.evaluate(async()=>{
  const {regionImageUrl}=await import('/src/features/regions/api.ts')
  const original='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/scenery-v1.png',src=regionImageUrl(original)
  return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({sameUrl:src===original,src,width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(Error('Background did not load'));image.src=src})
 })
 console.log(JSON.stringify(result))
}finally{await browser.close()}
