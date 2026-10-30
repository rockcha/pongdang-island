import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {chromium} from 'file:///C:/Users/ojr55/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core/index.mjs'
const workspace=process.cwd(),build=path.resolve('artifacts/previews/exploration/build')
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
 let file=path.join(build,pathname)
 if(!fs.existsSync(file))file=path.join(workspace,'public',pathname)
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff'})[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}
})
await new Promise(resolve=>server.listen(5195,'127.0.0.1',resolve))
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'})
const url='http://127.0.0.1:5195/artifacts/previews/exploration/index.html'
try{
 const lobby=await browser.newPage({viewport:{width:390,height:844}})
 await lobby.goto(url+'?public')
 if(!await lobby.getByRole('button',{name:'준비 중'}).isDisabled())throw Error('Public access is open')
 await lobby.screenshot({path:'artifacts/previews/exploration/preparing.png'})
 await lobby.goto(url);await lobby.getByRole('button',{name:'지하 탐험 시작'}).waitFor()
 await lobby.screenshot({path:'artifacts/previews/exploration/map-selection.png'});await lobby.close()
 for(const [width,height] of [[1280,720],[844,390],[568,320]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(url)
  await page.getByRole('button',{name:'지하 탐험 시작'}).click()
  if(width===844)await page.screenshot({path:'artifacts/previews/exploration/stairs.png'})
  await page.getByLabel('지하 1층으로 내려가는 중').waitFor({state:'detached'})
  const scene=page.getByRole('region',{name:'파라오 지하 탐험'}),bounds=await scene.boundingBox()
  if(bounds.width!==width||bounds.height!==height)throw Error('Game does not fill the viewport')
  const choices=page.getByRole('group',{name:'지하 1층의 세 문'}).getByRole('button')
  if(await choices.count()!==3)throw Error('Expected three doors')
  await choices.nth(1).click()
  await page.screenshot({path:`artifacts/previews/exploration/floor-${width}.png`})
  await page.getByRole('button',{name:'탐험 보관함'}).click()
  await page.getByRole('button',{name:'연습 물품 받기'}).click()
  await page.getByRole('heading',{name:'청동 단검'}).locator('..').getByRole('button').click()
  await page.getByRole('tab',{name:/보호구/}).click()
  await page.getByRole('heading',{name:'황금 흉갑'}).locator('..').getByRole('button').click()
  await page.getByRole('tab',{name:/마법/}).click()
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'마법 장착',exact:true}).first().click()
  await page.getByRole('button',{name:'마법 장착',exact:true}).click()
  await page.getByRole('alert').waitFor()
  if(width===844)await page.screenshot({path:'artifacts/previews/exploration/inventory.png'})
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'작은 불꽃 사용'}).click()
  await page.getByRole('button',{name:'탐험 나가기'}).click()
  if(width===844)await page.screenshot({path:'artifacts/previews/exploration/leave-confirm.png'})
  await page.getByRole('button',{name:'계속 탐험'}).click()
  await page.getByRole('region',{name:'파라오 지하 탐험'}).waitFor()
  await page.getByRole('button',{name:'탐험 나가기'}).click()
  await page.getByRole('button',{name:'저장하지 않고 나가기'}).click()
  await page.getByRole('button',{name:'지하 탐험 시작'}).waitFor()
  if(await page.locator('#root').evaluate(root=>root.inert))throw Error('Background remained inert')
  if(errors.length)throw Error(errors.join('\n'))
  console.log(JSON.stringify({width,height,bounds,threeDoors:true,equipmentChanged:true,spellLimit:3,exitGuard:true,errors}))
  await page.close()
 }
}finally{await browser.close();server.closeAllConnections();server.close()}
