import {existsSync,readdirSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const cache=join(homedir(),'AppData/Local/npm-cache/_npx')
const packagePath=readdirSync(cache).map(name=>join(cache,name,'node_modules/playwright-core/index.mjs')).find(existsSync)
if(!packagePath)throw Error('Playwright core not found')
const {chromium}=await import(pathToFileURL(packagePath).href)
const browser=await chromium.launch({headless:true,channel:'msedge'})
const base=process.argv[2]??'http://127.0.0.1:5178'
const errors=[]
try{
 const page=await browser.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 for(const [width,height] of [[320,568],[390,844],[768,900]]){
  await page.setViewportSize({width,height})
  await page.goto(base+'/artifacts/previews/fishing-overlays.html?mode=ready')
  const overlay=page.getByRole('button',{name:'입질이 왔어요. 터치해서 시작'})
  await overlay.waitFor()
  await overlay.locator('img').evaluate(image=>image.decode())
  if(await page.locator('[data-rod-gauge]').count())throw Error('Gauge visible before confirmation')
  if(width===390)await page.screenshot({path:'artifacts/previews/fishing-bite-confirmation.png'})
  await overlay.click()
  await page.getByRole('meter').waitFor({state:'attached'})
  if(await page.getByRole('button',{name:'꾹 눌러 당기기'}).getAttribute('aria-pressed')!=='false')throw Error('Confirm touch held the reel')
  await page.evaluate(()=>localStorage.clear())
  await page.goto(base+'/artifacts/previews/fishing-overlays.html?mode=settings')
  const setting=page.getByRole('switch',{name:'입질 확인 후 시작'})
  await setting.waitFor()
  if(await setting.getAttribute('aria-checked')!=='true')throw Error('Confirmation disabled by default')
  await setting.click();await page.reload()
  if(await page.getByRole('switch').getAttribute('aria-checked')!=='false')throw Error('Off preference not restored')
  if(width===390)await page.screenshot({path:'artifacts/previews/fishing-settings.png'})
  await page.goto(base+'/artifacts/previews/fishing-overlays.html?mode=waiting')
  const tip=page.getByRole('complementary',{name:'알고 계신가요?'})
  await tip.waitFor()
  if(width===390){await page.waitForTimeout(4500);await page.screenshot({path:'artifacts/previews/fishing-rumor-overlay.png'})}
  await page.getByRole('button',{name:'알고 계신가요? 이야기 접기'}).click()
  if(await tip.count())throw Error('Tip remained visible after dismissal')
  const story=await page.getByRole('button',{name:'알고 계신가요? 이야기 펼치기'}).boundingBox()
  const music=await page.getByRole('button',{name:/배경음악 (켜기|끄기)/}).boundingBox()
  if(!story||!music||Math.abs(story.y-music.y)>1||music.x<story.x+story.width||music.x-(story.x+story.width)>10||Math.abs(music.width-music.height)>1)throw Error('Music toggle not circular or beside minimized story')
  if(width===390)await page.screenshot({path:'artifacts/previews/fishing-story-minimized.png'})
  await page.getByRole('button',{name:'알고 계신가요? 이야기 펼치기'}).click()
  await tip.waitFor()
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1)
  if(overflow)throw Error('Viewport overflow at '+width)
 }
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: 320/390/768px; transparent rumor card, confirmation blocks gauge, touch starts without reeling, setting defaults on and off choice persists, no viewport overflow. No account or reward RPCs.')
}finally{await browser.close()}
