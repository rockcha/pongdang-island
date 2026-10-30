import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const region={...catalog.regions.find(r=>r.id==='pharaoh'),created_at:new Date(Date.now()-60000).toISOString(),unlocked:true,mapPieceCount:4,mapPieces:[1,2,3,4]}
const entries=catalog.collectible_species.filter(s=>s.native_region_id==='pharaoh').map(s=>({...s,is_native:true,discovered:false,habitats:[{id:'pharaoh'}]}))
const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true})
try{
 const page=await browser.newPage({deviceScaleFactor:2}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 for(const [file,exports] of [
  ['src/components/auth-provider.tsx','export const useAuth=()=>({session:{user:{id:"art-review"}}});'],
  ['src/features/regions/api.ts',`export const loadRegionMap=async()=>(${JSON.stringify({regions:[region],currentRegion:'pharaoh'})});`],
  ['src/features/regions/harbor-catalog.ts',`export const loadHarborCatalog=async()=>(${JSON.stringify(entries)});`],
 ])await page.route(url=>url.pathname==='/'+file&&!url.searchParams.has('review-real'),route=>route.fulfill({contentType:'application/javascript',body:`export * from '/${file}?review-real';\n${exports}`}))
 const results=[]
 for(const width of [390,560])for(const view of ['news','harbor','fishing']){
  await page.setViewportSize({width,height:844})
  await page.goto('http://127.0.0.1:5173/artifacts/previews/pharaoh/overview.html?view='+view)
  if(view!=='fishing')await page.getByRole('img',{name:view==='news'?'파라오의 황금해 풍경':'파라오의 황금해',exact:true}).waitFor()
  try{await page.waitForFunction(()=>[...document.images].filter(i=>i.src.includes('overview-v2.png')||i.src.includes('/region-icons/')).every(i=>i.complete&&i.naturalWidth>0),null,{timeout:10000})}catch(error){await page.screenshot({path:'artifacts/previews/pharaoh/overview-loading-debug.png',fullPage:true});console.log(JSON.stringify({view,width,errors}));throw error}
  await page.waitForTimeout(600)
  const scene=await page.evaluate(()=>{
   const image=[...document.images].find(i=>i.src.includes('overview-v2.png'))
   if(!image)return {view:'fishing',images:[...document.querySelectorAll('svg image')].map(i=>i.getAttribute('href'))}
   const s=getComputedStyle(image);return {src:image.src,fit:s.objectFit,width:image.naturalWidth,height:image.naturalHeight,box:{width:image.clientWidth,height:image.clientHeight}}
  })
  if(view!=='fishing'&&scene.fit!=='contain')throw Error('Overview is cropped')
  if(view==='fishing'&&!scene.images.includes('/fishing/scenery/pharaoh-v1.png'))throw Error('Fishing uses wrong scenery')
  const screenshot=`artifacts/previews/pharaoh/${view}-${width}.png`;await page.screenshot({path:screenshot,fullPage:true})
  results.push({view,width,scene,screenshot})
 }
 if(errors.length)throw Error(errors.join('\n'))
 fs.writeFileSync('artifacts/previews/pharaoh/overview-verification.json',JSON.stringify({verified_at:new Date().toISOString(),errors,results},null,2)+'\n')
 console.log(JSON.stringify({views:results.length,errors}))
}finally{await browser.close()}
