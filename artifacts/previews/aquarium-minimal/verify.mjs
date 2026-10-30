import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import {chromium} from 'file:///C:/Users/ojr55/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core/index.mjs'
const build=path.resolve('artifacts/previews/aquarium-minimal/build')
const workspace=process.cwd()
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
 let file=path.join(build,pathname)
 if(!fs.existsSync(file))file=path.join(workspace,'public',pathname)
 if(!fs.existsSync(file))file=path.join(workspace,pathname)
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg'})[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}
})
await new Promise(r=>server.listen(5194,'127.0.0.1',r))
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
try{
 for(const [width,height] of [[1440,810],[844,390],[568,320]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/storage/v1/object/public/aquarium-backgrounds/*',async route=>{
   const filename=decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1))
   const file=path.resolve('assets/storage-upload/new/20261025-014955/aquarium-backgrounds',filename)
   if(fs.existsSync(file))await route.fulfill({path:file,contentType:'image/png'});else await route.abort()
  })
  await page.goto('http://127.0.0.1:5194/artifacts/previews/aquarium-minimal/index.html')
  const original=await page.getByTestId('saved-positions').textContent()
  await page.getByRole('button',{name:'어항 관리',exact:true}).click()
  await page.getByRole('dialog',{name:'어항 관리',exact:true}).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'나의 작은 바다 어항 열기',exact:true}).click()
  await page.locator('[data-tank-ready="true"]').waitFor({timeout:30000})
  await page.waitForTimeout(500)
  const bounds=await page.getByTestId('aquarium-glass').boundingBox()
  if(Math.abs(bounds.width-width)>1||Math.abs(bounds.height-height)>1)throw Error('Tank does not fill the screen: '+JSON.stringify(bounds))
  await page.screenshot({path:`artifacts/previews/aquarium-minimal/wide-${width}.png`})
  await page.getByRole('button',{name:'어항 이름 바꾸기',exact:true}).click()
  await page.getByRole('dialog',{name:'어항 이름 바꾸기'}).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:/^목록 /}).click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  for(const button of await page.locator('.aquarium-wide-topbar button').all()){const box=await button.boundingBox();if(box&&(box.x<0||box.x+box.width>width||box.y+box.height>80))throw Error('Toolbar is not at the top')}
  await page.getByRole('button',{name:'어항 보기 설정',exact:true}).click()
  await page.getByRole('button',{name:'전체 보기',exact:true}).click()
  await page.getByRole('button',{name:'화면 채움',exact:true}).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'편집 모드 시작',exact:true}).click()
  await page.getByRole('button',{name:'살구 불가사리 선택',exact:true}).evaluate(button=>button.click())
  await page.waitForTimeout(300)
  const card=await page.locator('.aquarium-wide-selection').boundingBox()
  if(!card||card.x<0||card.x+card.width>width||card.y<70||card.y+card.height>height)throw Error('Selection card outside viewport: '+JSON.stringify(card))
  if(await page.getByRole('button',{name:'정보 보기',exact:true}).count())throw Error('Details should be removed')
  await page.screenshot({path:`artifacts/previews/aquarium-minimal/edit-${width}.png`})
  await page.getByRole('button',{name:'편집 모드 완료',exact:true}).click()
  if(original!==await page.getByTestId('saved-positions').textContent())throw Error('Viewing controls changed saved positions')
  await page.getByRole('button',{name:'가로 화면 종료',exact:true}).click()
  await page.getByRole('button',{name:'어항 관리',exact:true}).waitFor()
  if(await page.getByRole('region',{name:'가로 어항',exact:true}).count())throw Error('Wide mode did not exit')
  console.log(JSON.stringify({width,height,bounds,errors,positionsPreserved:true}))
  await page.close()
 }
}finally{await browser.close();server.close()}
