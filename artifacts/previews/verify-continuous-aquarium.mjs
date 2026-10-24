import {chromium} from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import {panCamera} from './pan-camera.mjs'
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'})
try {
 for(const width of (process.env.AQUARIUM_TEST_WIDTHS?.split(',').map(Number)??[320,390,1000])) {
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5186/artifacts/previews/aquarium-default-integration.html')
  const glass=page.getByTestId('aquarium-glass')
  await glass.locator('canvas').waitFor()
  await page.waitForTimeout(600)
  const view=()=>glass.evaluate(el=>+el.dataset.view)
  const move=value=>panCamera(page,value)
  await move(.73)
  const bounds=await glass.boundingBox()
  await page.mouse.move(bounds.x+bounds.width*.35,bounds.y+bounds.height*.2)
  await page.mouse.down()
  await page.mouse.move(bounds.x+bounds.width*.65,bounds.y+bounds.height*.2,{steps:12})
  await page.mouse.up()
  const stopped=await view()
  await page.waitForTimeout(500)
  if(Math.abs(stopped-await view())>.001||Math.abs(stopped-Math.round(stopped))<.1)throw Error('Camera snapped instead of stopping continuously')
  const read=async()=>JSON.parse(await page.getByTestId('saved-preview-items').textContent()).find(item=>item.species_id==='apricot-starfish')
  const geometry=async()=>page.evaluate(async({item,width,height,view})=>{
   const {decorationGeometry}=await import('/src/features/aquarium/decoration-geometry.ts')
   const catalog=(await import('/supabase/catalog/catalog.json')).default
   const species=catalog.collectible_species.find(s=>s.id==='apricot-starfish')
   const g=decorationGeometry({...item,species:{...species,size:Math.min(species.size,width*.48)}},width*3,height)
   return {x:g.margin+item.position_x*g.w+g.size/2-view*width,y:g.margin+item.position_y*g.h+g.size/2}
  },{item:await read(),width:bounds.width,height:bounds.height,view:await view()})
  for(const edge of ['right','left']) {
   await page.getByRole('button',{name:'살구 불가사리 선택'}).press('Enter')
   await page.getByRole('button',{name:'개체 선택 닫기'}).click()
   await page.waitForTimeout(1400)
   const point=await geometry(),before=(await read()).position_x
   await page.mouse.move(bounds.x+point.x,bounds.y+point.y)
   await page.mouse.down()
   await page.mouse.move(bounds.x+bounds.width*(edge==='right'?.98:.02),bounds.y+bounds.height*.42,{steps:25})
   await page.waitForTimeout(6500)
   await page.mouse.up()
   await page.waitForFunction(before=>JSON.parse(document.querySelector('[data-testid="saved-preview-items"]').textContent).some(item=>item.species_id==='apricot-starfish'&&Math.abs(item.position_x-before)>.1),before)
   const saved=await read(),position=await view()
   if(edge==='right'?(saved.position_x<.8||position<1.9):(saved.position_x>.2||position>.1))throw Error('Decoration could not travel across aquarium '+JSON.stringify({edge,saved,position}))
   await page.screenshot({path:`artifacts/previews/aquarium-continuous-${width}-${edge}.png`})
  }
  await page.getByRole('button',{name:'개체 선택 닫기'}).click()
  const inset=await geometry()
  await page.mouse.move(bounds.x+inset.x,bounds.y+inset.y)
  await page.mouse.down()
  await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.4,{steps:12})
  await page.mouse.up()
  await page.getByRole('button',{name:'살구 불가사리 선택'}).press('Enter')
  await page.getByRole('button',{name:'꾸미기',exact:true}).click()
  await page.waitForTimeout(1400)
  const centerBefore=await geometry()
  await page.getByRole('button',{name:'시계 방향 15도 회전',exact:true}).click()
  await page.getByRole('button',{name:'크기 키우기',exact:true}).click()
  await page.waitForTimeout(300)
  const centerAfter=await geometry()
  if(Math.hypot(centerAfter.x-centerBefore.x,centerAfter.y-centerBefore.y)>.01)throw Error('Rotation or scale moved decoration center '+JSON.stringify({centerBefore,centerAfter}))
  const saved=await read()
  await move(1.237)
  if(JSON.stringify(await read())!==JSON.stringify(saved))throw Error('Camera movement modified saved placement')
  if(errors.length)throw Error(JSON.stringify(errors))
  console.log({width,fractionalStop:stopped,edgeDragBothDirections:true,placementPreserved:true})
  await page.close()
 }
} finally { await browser.close() }
