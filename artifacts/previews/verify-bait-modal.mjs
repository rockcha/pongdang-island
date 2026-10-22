import {existsSync,readdirSync,readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const cache=join(homedir(),'AppData/Local/npm-cache/_npx')
const packagePath=readdirSync(cache).map(name=>join(cache,name,'node_modules/playwright-core/index.mjs')).find(existsSync)
const {chromium}=await import(pathToFileURL(packagePath).href)
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const baits=catalog.fishing_baits.map(bait=>({...bait,mechanicsVersion:2}))
const browser=await chromium.launch({headless:true,channel:'msedge'})
const failures=[]
try{
 const page=await browser.newPage({reducedMotion:'reduce'})
 page.on('pageerror',error=>failures.push(error.message))
 await page.route('**/src/features/gold/gold-provider.tsx*',route=>route.request().url().includes('real-icon')?route.continue():route.fulfill({contentType:'application/javascript',body:'export {GoldIcon} from "/src/features/gold/gold-provider.tsx?real-icon";export const useGold=()=>({wallet:{gold:99999999,inventory:{}},transact:async()=>{},batchEffects:async(work)=>work(),loading:false,busy:false,error:""});'}))
 await page.route('**/src/features/fishing/api.ts*',route=>route.fulfill({contentType:'application/javascript',body:`export const loadFishing=async()=>(${JSON.stringify({baits})});`}))
 for(const [width,height,fontSize] of [[320,568,16],[360,640,16],[375,667,16],[390,844,16],[412,915,16],[430,932,16],[768,900,16],[844,390,16],[320,568,20],[360,640,24]]){
  await page.setViewportSize({width,height})
  await page.goto('http://127.0.0.1:5178/artifacts/previews/shop-filters.html')
  await page.getByRole('searchbox',{name:'미끼 검색'}).waitFor()
  await page.evaluate(size=>document.documentElement.style.fontSize=size+'px',fontSize)
  const cases=[320,390,768].includes(width)&&fontSize===16?baits:baits.filter(bait=>['bait','bait_shooting_star_tail','bait_deep_sleep_sachet'].includes(bait.id))
  for(const bait of cases){
   await page.getByRole('button',{name:bait.name+' 상세 보기',exact:true}).click()
   const modal=page.getByRole('dialog')
   await modal.waitFor()
   const input=modal.getByRole('spinbutton',{name:'구매 수량'})
   if(await input.count())await input.fill('99')
   const layout=await modal.evaluate(root=>{
    const box=root.getBoundingClientRect(),purchase=root.querySelector('[aria-label="미끼 구매"]'),body=root.querySelector('[data-bait-detail-body]')
    const clipped=[...root.querySelectorAll('*')].filter(element=>{if(element.closest('.sr-only'))return false;const rect=element.getBoundingClientRect();return rect.width>0&&(rect.left<box.left-.5||rect.right>box.right+.5)}).map(element=>element.getAttribute('aria-label')??element.tagName)
    return {left:box.left,right:box.right,width:box.width,viewport:innerWidth,overflow:root.scrollWidth-root.clientWidth,footerOverflow:purchase.scrollWidth-purchase.clientWidth,bodyOverflow:body?body.scrollWidth-body.clientWidth:0,clipped}
   })
   if(layout.left<-.5||layout.right>width+.5||Math.abs(layout.left-(width-layout.right))>1||layout.overflow>1||layout.footerOverflow>1||layout.bodyOverflow>1||layout.clipped.length)failures.push({width,height,fontSize,bait:bait.id,...layout})
   if(bait.id==='bait_deep_sleep_sachet'&&fontSize===16&&[320,390,768].includes(width))await page.screenshot({path:`artifacts/previews/bait-detail-${width}.png`})
   await modal.getByRole('button',{name:'Close',exact:true}).click()
   await modal.waitFor({state:'hidden'})
  }
 }
 if(failures.length){console.log(JSON.stringify(failures,null,2));process.exitCode=1}
 else console.log('PASS: all catalog bait modals at 320/390/768px; selected cases at 360/375/412/430px, landscape and larger text; quantity 99; centered with no horizontal clipping. Local preview fixtures only.')
}catch(error){console.log(JSON.stringify(failures,null,2));throw error}finally{await browser.close()}
