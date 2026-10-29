import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const fixture={equippedId:'ocean-seed',changeFee:500,equipFee:0,unequipFee:500,canCraft:true,relics:catalog.fishing_relics.filter(r=>r.enabled).map(r=>({...r,owned:true,quantity:2,discovered:true}))}
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const report=[]
try{
 for(const [width,height,mode,motion,fontSize,dark] of [[390,844,'success','no-preference',16,false],[320,568,'failure','reduce',16,false],[844,390,'success','reduce',16,false],[1000,900,'failure','reduce',16,true],[320,568,'success','reduce',20,false]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:motion})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/src/components/auth-provider.tsx*',r=>r.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({session:{user:{id:"atelier-preview"}},recovery:false});'}))
  await page.route('**/src/features/relics/api.ts*',r=>r.request().url().includes('preview-real')?r.continue():r.fulfill({contentType:'application/javascript',body:`
   export * from '/src/features/relics/api.ts?preview-real';
   let state=${JSON.stringify(fixture)};
   export const readRelics=async()=>structuredClone(state);
   export async function craftRelic(a,b,operation){
    const first=state.relics.find(r=>r.id===a),second=state.relics.find(r=>r.id===b);
    const success=${mode==='success'};
    const relic={...first,id:'crafted-preview',name:first.name+' · '+second.name,crafted:true,attached:second,quantity:1,sell_price:0,description:first.description+' / '+second.description};
    state={...state,relics:state.relics.map(r=>({...r,quantity:r.quantity-((r.id===a||r.id===b)&&(success||r.id===a)?1:0)})).concat(success?[relic]:[]),craft:{success,cost:3000,chance:45,consumedId:success?null:a,craftedId:success?relic.id:null}};
    await new Promise(r=>setTimeout(r,200));return structuredClone(state);
   }`}))
  await page.goto('http://127.0.0.1:5173/artifacts/previews/relic-atelier.html')
  await page.evaluate(({fontSize,dark})=>{document.documentElement.style.fontSize=fontSize+'px';document.documentElement.classList.toggle('dark',dark)},{fontSize,dark})
  await page.getByRole('tab',{name:'세공',exact:true}).click()
  await page.getByRole('group',{name:'세공 재료 선택'}).waitFor()
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.relic-material-grid img')).slice(0,3).every(img=>img.complete&&img.naturalWidth>0))
  await page.waitForTimeout(200)
  await page.screenshot({path:`artifacts/previews/relic-atelier-${width}-${fontSize}-select.png`})
  await page.getByRole('button',{name:/^조개 모래시계 ·/}).click()
  await page.getByRole('button',{name:/^물고기를 부르는 방울 ·/}).click()
  const buttons=page.getByRole('button',{name:'세공하기',exact:true})
  const selection=await page.locator('.relic-craft').evaluate(root=>({width:root.clientWidth,overflow:root.scrollWidth>root.clientWidth,columns:getComputedStyle(root.querySelector('.relic-material-grid')).gridTemplateColumns.split(' ').length}))
  await buttons.click()
  if(motion==='no-preference'){
   await page.locator('[data-stage="forging"]').waitFor();await page.waitForTimeout(700)
   await page.screenshot({path:`artifacts/previews/relic-atelier-${width}-forging.png`})
  }
  await page.getByText(mode==='success'?'새로운 힘이 깨어났어요':'아쉽게도 결합하지 못했어요',{exact:true}).waitFor()
  await page.waitForTimeout(300)
  await page.screenshot({path:`artifacts/previews/relic-atelier-${width}-${mode}.png`})
  const result=await page.locator('main').evaluate(root=>({overflow:root.scrollWidth>root.clientWidth,footer:(()=>{const r=root.querySelector('.relic-craft-footer').getBoundingClientRect();return {top:r.top,bottom:r.bottom,visible:r.bottom<=innerHeight}})()}))
  report.push({width,height,mode,motion,fontSize,dark,selection,result,errors})
  if(selection.overflow||selection.columns!==3||result.overflow||!result.footer.visible||errors.length)throw Error(JSON.stringify(report.at(-1)))
  await page.close()
 }
 fs.writeFileSync('artifacts/previews/relic-atelier-verification.json',JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report))
}finally{await browser.close()}
