import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {mkdirSync,writeFileSync} from 'node:fs'
const {chromium}=await import(process.argv[2]?pathToFileURL(resolve(process.argv[2])).href:'playwright')
const executablePath=process.argv[3]??`${process.env['ProgramFiles(x86)']}/Microsoft/Edge/Application/msedge.exe`
const browser=await chromium.launch({executablePath,headless:true})
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:1})
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(pathToFileURL(resolve('artifacts/previews/firefly/index.html')).href)
 await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete))
 await page.locator('#kind').selectOption('fish')
 await page.locator('#rarity').selectOption('common')
 await page.waitForTimeout(300)
 mkdirSync('artifacts/previews/firefly/browser',{recursive:true})
 await page.screenshot({path:'artifacts/previews/firefly/browser/common-light.png',fullPage:true})
 await page.locator('#rarity').selectOption('epic')
 await page.locator('#background').selectOption('#152f32')
 await page.screenshot({path:'artifacts/previews/firefly/browser/epic-dark.png',fullPage:true})
 await page.locator('#rarity').selectOption('mythic')
 await page.locator('#animate').click()
 await page.waitForTimeout(1300)
 await page.screenshot({path:'artifacts/previews/firefly/browser/mythic-animation.png',fullPage:true})
 const state=await page.evaluate(()=>({items:items.length,ready:items.filter(i=>i.ready).length,animated:items.filter(i=>i.animated).length,playing,failedImages:Array.from(document.images).filter(i=>!i.naturalWidth).map(i=>i.src)}))
 if(errors.length||state.failedImages.length)throw Error(JSON.stringify({errors,...state}))
 writeFileSync('artifacts/previews/firefly/browser/verification.json',JSON.stringify({checkedAt:new Date().toISOString(),scope:'Local asset review page only; not production gameplay.',...state},null,2)+'\n')
 console.log(JSON.stringify(state))
}finally{await browser.close()}
