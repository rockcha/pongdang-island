import {chromium} from 'file:///C:/Users/ojr55/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core/index.mjs'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
const root='assets/storage-upload/new/20261028-220318',manifest=JSON.parse(readFileSync(root+'/manifest.json'))
const files=new Set(manifest.items.flatMap(i=>[i.thumbnail_path,i.sprite_sheet_path].filter(Boolean)))
mkdirSync('artifacts/previews/halloween-pongi',{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'})
try{
 const page=await browser.newPage({viewport:{width:1000,height:1100}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/storage/v1/object/public/collectibles/**',async route=>{const key=new URL(route.request().url()).pathname.split('/collectibles/')[1];if(!files.has(key))throw Error('Unexpected image '+key);await route.fulfill({path:resolve(root,key),contentType:'image/png'})})
 await page.goto('http://127.0.0.1:5185/'+root+'/review.html')
 await page.waitForFunction(()=>document.querySelectorAll('canvas').length===3&&document.querySelectorAll('[aria-busy="true"]').length===0&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0),{},{timeout:45000})
 await page.waitForTimeout(1200)
 await page.screenshot({path:'artifacts/previews/halloween-pongi/desktop.png',fullPage:true})
 const animation={}
 for(const id of ['halloween-pongi-candy-devil','halloween-pongi-ghost-blanket']){
  const target=page.locator('[data-species="'+id+'"] canvas'),hashes=[]
  for(let n=0;n<12;n++){await page.waitForTimeout(140);hashes.push(createHash('sha256').update(await target.screenshot()).digest('hex'))}
  animation[id]=new Set(hashes).size
  if(animation[id]<4)throw Error('Expected four distinct poses: '+id)
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300)
 const target=page.locator('[data-species="halloween-pongi-candy-devil"] canvas'),a=await target.screenshot();await page.waitForTimeout(400);if(!a.equals(await target.screenshot()))throw Error('Reduced motion changed pose')
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400)
 await page.screenshot({path:'artifacts/previews/halloween-pongi/mobile.png',fullPage:true})
 if(errors.length||await page.getByRole('alert').count())throw Error(JSON.stringify(errors))
 writeFileSync(root+'/preview-verification.json',JSON.stringify({testedAt:new Date().toISOString(),scope:'Local fixtures using actual TankInhabitants and CollectiblePreview, desktop/mobile and reduced motion; remote game sessions not tested',animation,errors},null,2)+'\n')
 console.log(JSON.stringify({passed:true,animation,errors}))
}finally{await browser.close()}
