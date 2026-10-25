import {existsSync,readdirSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'

const cache=join(homedir(),'AppData/Local/npm-cache/_npx')
const entry=readdirSync(cache).map(n=>join(cache,n,'node_modules/playwright-core/index.mjs')).find(existsSync)
if(!entry)throw Error('Playwright core not found')
const {chromium}=await import(pathToFileURL(entry).href)
const browser=await chromium.launch({headless:true,channel:'msedge'})
const base=process.argv[2]??'http://127.0.0.1:5182'
const specimen={description:'분류 확인용 미리보기입니다.',size:1,speed:0,swim_y_min:null,swim_y_max:null,sprite_sheet_path:null,movement_type:'fixed',sell_price:0,is_native:false,native_region_id:null,habitats:[]}
const catalog=[
 {...specimen,id:'preview-fish',name:'미리보기 물고기',kind:'fish',rarity:'common',sell_price:50,discovered:true,thumbnail_path:base+'/app-icons/kind-fish.png'},
 ...[1,2,3,4].map(n=>({...specimen,id:'preview-map-'+n,name:`냠냠섬의 ${n}번째 조각 (2/4)`,kind:'map',pieceNumber:n,mapRegionId:'nyamnyam',habitats:[{id:'nyamnyam',name:'냠냠섬'}],rarity:'rare',discovered:n===1||n===3,thumbnail_path:base+'/app-icons/map.png'})),
 {...specimen,id:'preview-relic',name:'분류 확인용 유물',kind:'relic',rarity:'epic',discovered:true,thumbnail_path:base+'/app-icons/collection-v2.png'},
]
const errors=[]
try{
 const page=await browser.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/rest/v1/rpc/**',route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1)
  if(name==='collection_state')return route.fulfill({json:{items:[],catalog}})
  if(name==='map_shop_state')return route.fulfill({json:{items:[]}})
  throw Error('Unexpected RPC '+name)
 })
 for(const [width,height] of [[320,568],[390,844],[768,900]]){
  await page.setViewportSize({width,height})
  await page.goto(base+'/artifacts/previews/discovery-catalog.html')
  await page.getByRole('article',{name:'미리보기 물고기'}).waitFor()
  await page.getByRole('button',{name:'지도 조각',exact:true}).click()
  if(await page.getByRole('article').count()!==4)throw Error('Map category did not show four pieces')
  if(await page.getByRole('button',{name:/임시 넣기/}).count())throw Error('Map placement control leaked')
  if(!await page.getByText('발견 2/4',{exact:true}).count())throw Error('Wrong discovery progress')
  await page.getByRole('article').locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())))
  await page.getByRole('article',{name:'냠냠섬 2번째 지도',exact:true}).getByRole('heading',{name:'2번째 지도',exact:true}).waitFor()
  const locked=page.getByRole('article',{name:'냠냠섬 2번째 지도',exact:true}).locator('.grayscale')
  if(await locked.evaluate(e=>getComputedStyle(e).filter)!=='grayscale(1)')throw Error('Uncollected map piece is not grayscale')
  if(await page.getByRole('article',{name:'냠냠섬 1번째 지도',exact:true}).locator('.grayscale').count())throw Error('Collected map piece is still grayscale')
  if(width===390)await page.screenshot({path:'artifacts/previews/discovery-map-category.png'})
  await page.getByRole('button',{name:'유물',exact:true}).click()
  if(await page.getByRole('article').count()!==1)throw Error('Relic category did not filter')
  if(await page.getByRole('button',{name:/임시 넣기/}).count())throw Error('Relic placement control leaked')
  await page.getByRole('article').locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())))
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight+1)
  if(overflow)throw Error('Viewport overflow at '+width)
  if(width===390)await page.screenshot({path:'artifacts/previews/discovery-relic-category.png'})
  await page.getByRole('button',{name:'분류 확인용 유물 상세 보기'}).click()
  await page.getByText('최초 1회 발견 · 어항 배치·판매·선물·거래 불가').waitFor()
 }
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS: map/relic filters, collected count, restricted details, no placement controls or overflow at 320/390/768px. Fixture RPCs only; no login or writes.')
}finally{await browser.close()}
