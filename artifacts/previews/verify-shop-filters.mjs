import {existsSync,readdirSync,readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
const cache=join(homedir(),'AppData/Local/npm-cache/_npx')
const packagePath=readdirSync(cache).map(name=>join(cache,name,'node_modules/playwright-core/index.mjs')).find(existsSync)
const {chromium}=await import(pathToFileURL(packagePath).href)
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const baits=catalog.fishing_baits.map(bait=>({...bait,mechanicsVersion:2}))
const browser=await chromium.launch({headless:true,channel:'msedge'})
try{
 const page=await browser.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 // Replace only preview module responses; no account or database requests are made.
 await page.route('**/src/features/gold/gold-provider.tsx*',route=>route.fulfill({contentType:'application/javascript',body:'export const GoldIcon=()=>null;export const useGold=()=>({wallet:{gold:10000,inventory:{}},transact:async()=>{},batchEffects:async(work)=>work(),loading:false,busy:false,error:""});'}))
 await page.route('**/src/features/fishing/api.ts*',route=>route.fulfill({contentType:'application/javascript',body:`export const loadFishing=async()=>(${JSON.stringify({baits})});`}))
 const url='http://127.0.0.1:5178/artifacts/previews/shop-filters.html'
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844})
  await page.goto(url)
  await page.getByRole('searchbox',{name:'미끼 검색'}).waitFor()
  const filterBar=page.getByRole('search',{name:'미끼 검색 및 필터'})
  const filterBefore=await filterBar.boundingBox()
  const scrollArea=page.locator('[data-shop-scroll]')
  const scrollTop=await scrollArea.evaluate(element=>{element.scrollTop=500;return element.scrollTop})
  const filterAfter=await filterBar.boundingBox()
  if(scrollTop<100||!filterBefore||!filterAfter||Math.abs(filterBefore.y-filterAfter.y)>1)throw Error('Bait filters did not stay fixed while scrolling at '+width)
  if(await page.getByText(/^\d+종의 미끼$/).count())throw Error('Bait count label still visible')
  if(width===390)await page.screenshot({path:'artifacts/previews/bait-shop-search-sticky.png'})
  await scrollArea.evaluate(element=>{element.scrollTop=0})
  await page.getByRole('combobox',{name:'미끼 포획 대상'}).click()
  await page.getByRole('option',{name:'쓰레기',exact:true}).click()
  await page.getByRole('combobox',{name:'미끼 대기시간'}).click()
  if(width===390)await page.screenshot({path:'artifacts/previews/bait-shop-filter-menu.png'})
  const menu=await page.getByRole('listbox').boundingBox()
  if(!menu||menu.x<0||menu.x+menu.width>width)throw Error('Bait menu overflow at '+width)
  await page.getByRole('option',{name:'보통',exact:true}).click()
  await page.getByRole('searchbox',{name:'미끼 검색'}).fill('존재하지않는미끼')
  await page.getByText('조건에 맞는 미끼가 없어요.').waitFor()
  await page.getByRole('button',{name:'검색·필터 초기화'}).click()
  if(await page.getByRole('button',{name:/상세 보기$/}).count()!==baits.length)throw Error('Reset did not restore baits')
  if(width===390)await page.screenshot({path:'artifacts/previews/bait-shop-search.png'})
  await page.goto(url+'?production')
  const sort=page.getByRole('combobox',{name:'생산소 정렬'})
  await sort.click()
  const productionMenu=await page.getByRole('listbox').boundingBox()
  if(!productionMenu||productionMenu.x<0||productionMenu.x+productionMenu.width>width)throw Error('Production menu overflow at '+width)
  if(width===390)await page.screenshot({path:'artifacts/previews/production-shop-select.png'})
  await page.getByRole('option',{name:'생산량 많은 순'}).click()
  if(!await sort.textContent().then(text=>text.includes('생산량 많은 순')))throw Error('Production sorting not updated')
 }
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: 320/390/768px; search and filters stay fixed during list scrolling; no bait count; combined filters, empty reset and themed menus. Preview fixtures only; no account/database requests.')
}finally{await browser.close()}
