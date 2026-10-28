import fs from 'node:fs'
import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
const root='assets/storage-upload/new/20261029-055051'
const review='artifacts/starruins-bluegold-review'
fs.mkdirSync(review,{recursive:true})
const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
const failed=[];page.on('requestfailed',r=>failed.push(r.url()))
await page.goto('http://127.0.0.1:5193/artifacts/starruins-bluegold-preview.html')
await page.waitForFunction(()=>window.starruinsPreview?.loaded===16&&window.starruinsTank?.inhabitants.length===16,{timeout:60000})
await page.locator('.card').last().scrollIntoViewIfNeeded()
await page.waitForFunction(()=>Array.from(document.querySelectorAll('.actual [aria-busy]')).every(e=>e.getAttribute('aria-busy')==='false'))
for(const card of await page.locator('.card').all()){await card.scrollIntoViewIfNeeded();await page.waitForTimeout(120)}
await page.evaluate(()=>window.scrollTo(0,0))
await page.screenshot({path:review+'/desktop.png'})
const start=await page.evaluate(()=>window.starruinsTank)
// Actual renderer runs through three full 6-second action cycles.
const samples=[]
for(let i=0;i<19;i++){
 samples.push(await page.evaluate(()=>window.starruinsTank))
 await page.waitForTimeout(1000)
}
const end=await page.evaluate(()=>window.starruinsTank)
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
const movement=manifest.items.map(s=>{
 const a=start.inhabitants.find(i=>i.id===s.id),b=end.inhabitants.find(i=>i.id===s.id)
 const fixed=s.kind==='decoration'||s.movement_type==='fixed'
 const ys=samples.map(t=>t.inhabitants.find(i=>i.id===s.id).y)
 return {id:s.id,type:s.movement_type,fixed,delta:Math.hypot(a.x-b.x,a.y-b.y),yRange:Math.max(...ys)-Math.min(...ys),passed:fixed?Math.abs(a.x-b.x)<.01&&Math.abs(a.y-b.y)<.01:s.movement_type==='crawl'?a.y/start.height>.8&&b.y/end.height>.8:Math.hypot(a.x-b.x,a.y-b.y)>.01}
})
await page.locator('.controls').evaluate(e=>e.style.visibility='hidden')
await page.evaluate(()=>document.body.classList.add('dark'));await page.locator('#grid').screenshot({path:review+'/cards-dark.png'})
await page.evaluate(()=>document.body.classList.remove('dark'));await page.locator('#grid').screenshot({path:review+'/cards-light.png'})
await page.locator('.controls').evaluate(e=>e.style.visibility='visible')
await page.locator('#reduced').click();await page.emulateMedia({reducedMotion:'reduce'})
await page.locator('.card').last().scrollIntoViewIfNeeded();await page.waitForTimeout(300)
const before=await page.locator('.actual canvas').evaluateAll(cs=>cs.map(c=>c.toDataURL()))
await page.waitForTimeout(500)
const after=await page.locator('.actual canvas').evaluateAll(cs=>cs.map(c=>c.toDataURL()))
const reduced=before.length===13&&before.every((v,i)=>v===after[i])
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0))
await page.screenshot({path:review+'/mobile.png'})
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
const result={scope:'Local bundled assets in actual collection preview and Phaser aquarium; no production deployment or remote mutation',errors,failed,movement,reduced,overflow,passed:errors.length===0&&failed.length===0&&movement.every(s=>s.passed)&&reduced&&!overflow}
fs.writeFileSync(root+'/preview-verification.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))
await browser.close()
if(!result.passed)process.exitCode=1
