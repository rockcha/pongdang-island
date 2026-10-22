import { chromium } from 'file:///C:/Users/user/Desktop/holoseogi-counsel/node_modules/playwright-core/index.mjs'
import { readFileSync } from 'node:fs'

const catalog = JSON.parse(readFileSync('supabase/catalog/catalog.json', 'utf8'))
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/user/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe' })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [], actions = []
  page.on('pageerror', e => errors.push(e.message))
  const stamp = Date.now(), date = mins => new Date(stamp + mins * 60000).toISOString()
  const state = { serverNow: date(0), gold: 10000, fuel: 3, facilities: catalog.production_facilities.map(f => ({ ...f, owned: false, startedAt: null, completesAt: null, expiresAt: null, runOutput: null })).sort((a,b)=>a.price-b.price||a.id.localeCompare(b.id)) }
  await page.route('**/rest/v1/rpc/production_*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1), args = route.request().postDataJSON()
    if (name === 'production_materials') {
      if (state.facilities.find(f => f.id === args.p_facility)?.kind !== 'fish') throw Error('Wrong material category')
      return route.fulfill({ json: [{ id: 'smelt', name: '정제용 빙어', sell_price: 15, available: 30, rarity: 'common', thumbnail_path: '' }] })
    }
    if (name === 'production_action') {
      actions.push(args)
      const f = state.facilities.find(f => f.id === args.p_facility)
      if (args.p_action === 'buy') { f.owned = true; state.gold -= f.price }
      else if (args.p_action === 'start') Object.assign(f, { startedAt: date(0), completesAt: date(f.production_minutes), expiresAt: date(f.production_minutes + f.storage_minutes), runOutput: f.output_count })
      else { if (args.p_action === 'claim') state.fuel += f.runOutput; Object.assign(f, { startedAt: null, completesAt: null, expiresAt: null, runOutput: null }) }
    }
    await route.fulfill({ json: state })
  })
  await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html?shop')
  await page.getByRole('tab', { name: '어유 정제' }).click()
  await page.getByRole('button', { name: '부두 할머니의 정제솥 · 구매', exact: true }).waitFor()
  if (await page.getByRole('article').count() !== 18) throw Error('Missing fish facilities')
  if (await page.getByText('준비 중', { exact: true }).count()) throw Error('Coming soon still visible')
  await page.evaluate(async paths => {
    await Promise.all(paths.map(async src => {
      const img = new Image(); img.src = src; await img.decode()
      if (img.width !== 512 || img.height !== 512) throw Error('Unexpected art size: ' + src)
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0)
      const data = ctx.getImageData(0, 0, 512, 512).data
      let minX=512,minY=512,maxX=-1,maxY=-1
      for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(y*512+x)*4+3]>16){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
      if(minX<40||minY<35||maxX>472||maxY>464||maxX<0)throw Error('Art clipping or baseline mismatch: '+src)
    }))
  }, catalog.production_facilities.filter(f=>f.kind==='fish').map(f=>f.image_path))
  await page.waitForFunction(()=>[...document.querySelectorAll('article img[src^="/production/"]')].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'))
  await page.screenshot({ path: 'artifacts/previews/fish-production-shop-mobile.png' })
  for (const [id, price] of [['dock-grandma-refining-pot',900],['coral-honeycomb-thermal-refinery',2850],['otter-moon-maturation-tank',3100]]) {
    const f=state.facilities.find(f=>f.id===id)
    await page.getByRole('button',{name:f.name+' · 구매',exact:true}).click()
    await page.getByRole('button',{name:price.toLocaleString('ko-KR')+'골드로 구매하기',exact:true}).click()
    await page.getByRole('article',{name:f.name,exact:true}).getByText('보유 1곳',{exact:true}).waitFor()
  }
  await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html')
  await page.getByRole('tab',{name:'어유 정제'}).click()
  await page.getByRole('button',{name:'부두 할머니의 정제솥 · 가동 대기',exact:true}).click()
  await page.getByText('정제용 빙어',{exact:true}).waitFor()
  if(await page.getByRole('dialog').getByText('20분',{exact:true}).count())throw Error('Facility details remain in the material modal')
  await page.getByRole('button',{name:'자동 넣기',exact:true}).click()
  await page.screenshot({path:'artifacts/previews/fish-production-materials.png'})
  await page.getByRole('button',{name:'재료 넣고 가동하기',exact:true}).click()
  await page.getByRole('dialog').waitFor({state:'hidden'})
  if(actions.at(-1).p_materials.smelt!==1)throw Error('Wrong fish consumption')
  if(await page.locator('[data-production-working-overlay]').count()!==1)throw Error('Missing working overlay')
  await page.screenshot({path:'artifacts/previews/fish-production-owned.png'})
  for(const width of [320,390,1280]) {
    await page.setViewportSize({width,height:900})
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow at '+width)
  }
  await page.goto('http://127.0.0.1:5175/artifacts/previews/production.html?shop')
  await page.getByRole('tab',{name:'어유 정제'}).click()
  await page.getByRole('article',{name:'물방울 유리 증류기',exact:true}).waitFor()
  await page.waitForFunction(()=>[...document.querySelectorAll('article img[src^="/production/"]')].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'))
  await page.screenshot({path:'artifacts/previews/fish-production-shop-desktop.png'})
  if(errors.length)throw Error(errors.join('\n'))
  console.log('PASS: 18 fish assets, alpha padding, fish purchases/materials/working overlay, 8h/10h facilities, 320/390/1280px layouts. Mocked RPC; no real player changes.')
} finally { await browser.close() }
