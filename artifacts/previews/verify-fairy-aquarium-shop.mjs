import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import assert from 'node:assert/strict'
const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true})
const halloween=process.argv.includes('--halloween'),pharaoh=process.argv.includes('--pharaoh')
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1}),errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.goto('http://127.0.0.1:5173/artifacts/previews/fairy-aquarium-shop.html'+(pharaoh?'?collection=pharaoh':halloween?'?collection=halloween':''))
await page.getByRole('button',{name:'배경 바꾸기',exact:true}).click()
await page.getByRole('tab',{name:'구매',exact:true}).click()
await page.getByRole('button',{name:/스페셜/}).click()
const themes=pharaoh?[['잠든 피라미드의 뜰','2,500',1],['태양이 잠긴 왕릉','3,000',2]]:halloween?[['호박등 아래 작은 찻집','1,500',1],['달빛에 잠든 유령 온실','1,650',2],['마녀가 비운 보랏빛 방','1,800',3]]:[['이슬 머금은 요정숲','1,500',1],['꽃잎 속 요정 궁전','1,650',2],['달빛 잠든 요정 호수','1,800',3]]
for(const [name,price,index] of themes){
 const card=page.locator('li').filter({has:page.getByText(name,{exact:true})})
 await card.scrollIntoViewIfNeeded()
 const art=card.getByRole('img',{name,exact:true})
 await art.waitFor();await art.evaluate(async image=>{await image.decode()})
 const loaded=await art.evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight,fit:getComputedStyle(image).objectFit}))
 assert(loaded.width>0&&loaded.height>0);assert.equal(loaded.fit,'contain')
 await card.getByRole('button',{name:price+' 구매',exact:true}).click()
 const guard=page.getByRole('alertdialog')
 await guard.getByText(name+' 배경을 '+price+'골드에 구매합니다.',{exact:true}).waitFor()
 await guard.getByRole('button',{name:'취소',exact:true}).click()
 await guard.waitFor({state:'hidden'});await page.waitForTimeout(200)
 await card.screenshot({path:'artifacts/previews/'+(pharaoh?'pharaoh':halloween?'halloween':'fairy')+'-aquarium-shop-'+index+'.png'})
}
assert.equal(errors.length,0,errors.join('\n'))
console.log(JSON.stringify({cards:themes.length,prices:themes.map(t=>Number(t[1].replaceAll(',',''))),publicFacingPreview:true,purchaseConfirmations:true,uncropped:true,errors}))
await browser.close()
