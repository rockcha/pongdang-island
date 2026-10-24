import { chromium } from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const manifest=JSON.parse(readFileSync('assets/storage-upload/new/20261025-014955/manifest.json','utf8'))
const registry=JSON.parse(readFileSync('src/features/aquarium/theme-panoramas.json','utf8'))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const origin='http://127.0.0.1:5186'
try {
 for(const file of manifest.files){
  if(file.status!=='generated')throw Error('Missing generated theme '+file.theme_id)
  if(registry[file.original_image_path]!==file.storage_path)throw Error('Registry mismatch '+file.theme_id)
  const bytes=readFileSync('assets/storage-upload/new/20261025-014955/'+file.local_path)
  if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Hash mismatch '+file.theme_id)
 }
 const page=await browser.newPage({viewport:{width:1400,height:1000}})
 const errors=[],remote=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*.supabase.co/**',route=>{remote.push(route.request().url());return route.abort()})
 for(let i=0;i<Math.ceil(manifest.files.length/8);i++){
  await page.goto(origin+'/artifacts/previews/aquarium-theme-gallery.html?page='+i)
  await page.waitForFunction(()=>document.images.length>0&&[...document.images].every(img=>img.complete&&img.naturalWidth>1200))
  await page.screenshot({path:`artifacts/previews/aquarium-theme-panoramas-${i}.png`,fullPage:true})
 }
 await page.setViewportSize({width:390,height:844})
 await page.goto(origin+'/aquarium-lab')
 await page.waitForFunction(()=>document.querySelector('[data-testid="panorama-glass"]')?.dataset.ready==='true')
 for(const file of manifest.files){
  await page.getByLabel('어항 테마',{exact:true}).selectOption(file.theme_id)
  await page.waitForFunction(id=>{const img=document.querySelector('[data-testid="panorama-background"] img');return img?.getAttribute('src')?.includes('/'+id+'-panorama-v2.png')&&img.complete&&img.naturalWidth>1200},file.theme_id)
  for(const label of ['왼쪽','가운데','오른쪽']){
   await page.getByRole('button',{name:label+' 보기',exact:true}).click()
   await page.waitForFunction(index=>Math.abs(+document.querySelector('[data-testid="panorama-glass"]').dataset.view-index)<.001,['왼쪽','가운데','오른쪽'].indexOf(label))
  }
 }
 if(errors.length||remote.length)throw Error(JSON.stringify({errors,remote}))
 console.log(JSON.stringify({themes:manifest.files.length,hashes:true,allImagesLoaded:true,threePanes:true,remoteRequests:remote.length}))
}finally{await browser.close()}
