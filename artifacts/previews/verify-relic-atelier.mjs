import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const fixture={equippedId:'ocean-seed',changeFee:500,equipFee:0,unequipFee:500,canCraft:true,relics:catalog.fishing_relics.filter(r=>r.enabled).map(r=>({...r,owned:true,quantity:2,discovered:true}))}
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const report=[]
try{
 for(const [width,height,mode,motion,fontSize,dark,modal=false] of [[390,844,'success','no-preference',16,false],[320,568,'failure','reduce',16,false],[844,390,'success','reduce',16,false],[1000,900,'failure','reduce',16,true],[320,568,'success','reduce',20,false],[320,568,'failure','reduce',16,false,true],[844,390,'failure','reduce',16,false,true]]){
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
    state={...state,relics:state.relics.map(r=>({...r,quantity:r.quantity-((r.id===a||r.id===b)&&(success||r.id===a)?1:0)})).concat(success?[relic]:[]),craft:{success,cost:5000,chance:35,consumedId:success?null:a,craftedId:success?relic.id:null}};
    await new Promise(r=>setTimeout(r,200));return structuredClone(state);
   }`}))
  await page.goto('http://127.0.0.1:5173/artifacts/previews/relic-atelier.html'+(modal?'?dialog=1':''))
  await page.evaluate(({fontSize,dark})=>{document.documentElement.style.fontSize=fontSize+'px';document.documentElement.classList.toggle('dark',dark)},{fontSize,dark})
  if(modal)await page.getByRole('button',{name:'유물 장착',exact:true}).click()
  await page.getByRole('tab',{name:'세공',exact:true}).waitFor()
  await page.getByRole('button',{name:'장착 유물 교체',exact:true}).click()
  const inventory=await page.locator('[aria-label="보유 유물"]').evaluate(root=>Object.fromEntries(['rare','epic','mythic'].map(r=>[r,getComputedStyle(root.querySelector(`[data-rarity="${r}"]`)).backgroundColor])))
  const tabs=await page.getByRole('tablist',{name:'유물 메뉴',includeHidden:true}).evaluate(root=>({radius:getComputedStyle(root).borderRadius,width:root.getBoundingClientRect().width,children:[...root.children].map(c=>c.getBoundingClientRect().width)}))
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.relic-inventory-card img')).slice(0,4).every(img=>img.complete&&img.naturalWidth>0))
  await page.screenshot({path:`artifacts/previews/relic-picker${modal?'-dialog':''}-${width}-${fontSize}-inventory.png`})
  await page.getByRole('dialog',{name:'유물 교체',exact:true}).getByRole('button',{name:'Close',exact:true}).click()
  await page.getByRole('tab',{name:'세공',exact:true}).click()
  await page.getByRole('button',{name:'기본 유물 선택',exact:true}).click()
  const picker=page.getByRole('dialog',{name:'기본 유물 선택',exact:true})
  await picker.waitFor()
  if(!await picker.getByRole('button',{name:/장착 1개, 사용 가능 1개/}).isEnabled())throw Error('Equipped spare must be usable')
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.relic-material-grid img')).slice(0,3).every(img=>img.complete&&img.naturalWidth>0))
  await page.waitForTimeout(200)
  const columns=await picker.locator('.relic-material-grid').evaluate(root=>getComputedStyle(root).gridTemplateColumns.split(' ').length)
  await picker.getByLabel('유물 등급',{exact:true}).selectOption('mythic')
  if(await picker.locator('.relic-material-card:not([data-rarity="mythic"])').count())throw Error('Rarity filter failed')
  await picker.getByLabel('유물 등급',{exact:true}).selectOption('all')
  await page.screenshot({path:`artifacts/previews/relic-picker${modal?'-dialog':''}-${width}-${fontSize}-modal.png`})
  await page.getByRole('button',{name:mode==='failure'?/^바다의 기억을 가리키는 나침반 ·/:/^조개 모래시계 ·/}).click()
  await page.locator('.relic-picker-dialog').waitFor({state:'hidden'})
  await page.getByRole('button',{name:'결합할 유물 선택',exact:true}).click()
  await page.getByRole('button',{name:mode==='failure'?/^찰나를 낚는 낚싯바늘 ·/:/^물고기를 부르는 방울 ·/}).click()
  await page.locator('.relic-picker-dialog').waitFor({state:'hidden'})
  await page.screenshot({path:`artifacts/previews/relic-picker${modal?'-dialog':''}-${width}-${fontSize}-workbench.png`})
  const buttons=page.getByRole('button',{name:'세공하기',exact:true})
  const selection=await page.locator('.relic-craft').evaluate(root=>{
   const body=root.querySelector('.relic-craft-body'),box=body.getBoundingClientRect(),forge=root.querySelector('.relic-forge').getBoundingClientRect()
   return {width:root.clientWidth,overflow:root.scrollWidth>root.clientWidth,scrolls:body.scrollHeight>body.clientHeight+1,clipped:forge.top<box.top-1||forge.bottom>box.bottom+1}
  })
  await buttons.click()
  await page.getByRole('alertdialog').getByRole('button',{name:'세공 시작',exact:true}).click()
  if(motion==='no-preference'){
   await page.locator('[data-stage="forging"]').waitFor();await page.waitForTimeout(700)
   await page.screenshot({path:`artifacts/previews/relic-picker${modal?'-dialog':''}-${width}-forging.png`})
  }
  await page.getByText(mode==='success'?'세공 성공':'세공 실패',{exact:true}).waitFor()
  await page.waitForTimeout(300)
  await page.screenshot({path:`artifacts/previews/relic-picker${modal?'-dialog':''}-${width}-${mode}.png`})
  const result=await page.locator('.relic-craft').evaluate(root=>{
   const body=root.querySelector('.relic-craft-body'),box=body.getBoundingClientRect(),forge=root.querySelector('.relic-forge').getBoundingClientRect(),footer=root.querySelector('.relic-craft-footer').getBoundingClientRect()
   return {overflow:root.scrollWidth>root.clientWidth,scrolls:body.scrollHeight>body.clientHeight+1,clipped:forge.top<box.top-1||forge.bottom>box.bottom+1,english:/RELIC ATELIER|THE BOND|A NEW RELIC/.test(root.textContent),footer:{top:footer.top,bottom:footer.bottom,visible:footer.bottom<=innerHeight}}
  })
  report.push({width,height,mode,motion,fontSize,dark,modal,inventory,tabs,columns,selection,result,errors})
  if(selection.overflow||selection.scrolls||selection.clipped||columns!==3||new Set(Object.values(inventory)).size!==3||tabs.radius!=='0px'||Math.abs(tabs.children[0]-tabs.children[1])>1||result.overflow||result.scrolls||result.clipped||result.english||!result.footer.visible||errors.length)throw Error(JSON.stringify(report.at(-1)))
  await page.close()
 }
 fs.writeFileSync('artifacts/previews/relic-picker-verification.json',JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report))
}finally{await browser.close()}
