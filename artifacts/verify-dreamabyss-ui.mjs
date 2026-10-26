import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
const root='assets/storage-upload/new/20261026-033245',manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'))
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
const hash=s=>createHash('sha256').update(s).digest('hex')
try{
 const page=await browser.newPage({viewport:{width:1040,height:1250},deviceScaleFactor:1}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/storage/v1/object/public/collectibles/**',async route=>{
  const path=decodeURIComponent(new URL(route.request().url()).pathname.split('/collectibles/')[1]),file=root+'/'+path
  if(!existsSync(file))throw Error('Unexpected artwork request '+path)
  await route.fulfill({path:file,contentType:'image/png',headers:{'access-control-allow-origin':'*'}})
 })
 await page.goto('http://127.0.0.1:5174/artifacts/dreamabyss-review.html')
 await page.waitForFunction(()=>window.__abyssFrame?.inhabitants.length===10&&window.__abyssFrame.clock>1)
 await page.waitForFunction(()=>document.querySelectorAll('article canvas').length===10&&[...document.querySelectorAll('article [aria-busy]')].every(e=>e.getAttribute('aria-busy')==='false'))
 mkdirSync('artifacts/previews/dreamabyss',{recursive:true})
 const clips=await page.locator('article').evaluateAll(nodes=>nodes.map(n=>{const r=n.querySelector('canvas').getBoundingClientRect();return {id:n.dataset.species,left:Math.round(r.x),top:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}}))
 const rendered=async()=>{const screenshot=await page.screenshot();return Promise.all(clips.map(async({id,...clip})=>({id,hash:hash(await sharp(screenshot).extract(clip).png().toBuffer())})))}
 const before=await page.evaluate(()=>window.__abyssFrame),poses=Object.fromEntries(manifest.items.map(i=>[i.id,new Set()]))
 for(let i=0;i<32;i++){
  const states=await rendered()
  for(const state of states)poses[state.id].add(state.hash)
  if([0,8,16,24].includes(i))await page.screenshot({path:'artifacts/previews/dreamabyss/light-'+i+'.png'})
  await page.waitForTimeout(220)
 }
 const after=await page.evaluate(()=>window.__abyssFrame)
 const tank=await page.locator('#tank').boundingBox()
 for(const i of after.inhabitants){const screenX=i.x/after.width*tank.width,screenY=tank.height/2+(i.y-after.height/2)*tank.width/after.width;if(screenX<0||screenX>tank.width||screenY<0||screenY>tank.height)throw Error('Creature outside fitted aquarium '+i.id)}
 for(const i of after.inhabitants){const index=Number(i.id.split('-').at(-1)),species=manifest.items[index],prior=before.inhabitants.find(p=>p.id===i.id);if(species.movement_type==='crawl'&&i.y<after.height*.75)throw Error('Crawler above floor '+species.id);if(Math.abs(i.x-prior.x)+Math.abs(i.y-prior.y)<.01)throw Error('Moving creature frozen '+species.id)}
 for(const [id,values] of Object.entries(poses))if(values.size<3)throw Error('Preview animation missing '+id)
 await page.goto('http://127.0.0.1:5174/artifacts/dreamabyss-review.html?theme=dark');await page.waitForTimeout(2000);await page.screenshot({path:'artifacts/previews/dreamabyss/dark.png'})
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500)
 const a=await rendered();await page.waitForTimeout(800)
 const b=await rendered();if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Reduced motion still animates')
 if(errors.length)throw Error(errors.join('\n'))
 writeFileSync('artifacts/dreamabyss-ui.json',JSON.stringify({scope:'Synthetic local aquarium and actual encyclopedia preview; local generated PNG requests; no player data',before,after,distinctRenderedPoses:Object.fromEntries(Object.entries(poses).map(([id,p])=>[id,p.size])),reducedMotion:true,errors},null,2))
 console.log('PASS: all 10 render and move, crawlers remain on floor, previews animate, reduced motion freezes, no browser errors')
}finally{await browser.close()}
