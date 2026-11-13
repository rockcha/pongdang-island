import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import sharp from 'sharp'
const batch = 'artifacts/tower-defense/browser',
  port = Number(process.argv[2] ?? 5179),
  profile = resolve(`tmp/tower-defense-chrome-${process.pid}-${Date.now()}`),
  delay = (ms) => new Promise((r) => setTimeout(r, ms))
async function connect(url) {
  const socket = new WebSocket(url),
    pending = new Map(),
    events = []
  let seq = 0
  await new Promise((r, j) => {
    socket.addEventListener('open', r, { once: true })
    socket.addEventListener('error', j, { once: true })
  })
  socket.addEventListener('message', (e) => {
    const m = JSON.parse(e.data),
      p = pending.get(m.id)
    if (m.method?.startsWith('WebAudio.')) events.push(m)
    if (m.method === 'Page.javascriptDialogOpening')
      socket.send(
        JSON.stringify({
          id: ++seq,
          method: 'Page.handleJavaScriptDialog',
          params: { accept: true },
        }),
      )
    if (p) {
      pending.delete(m.id)
      clearTimeout(p.timer)
      m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result)
    }
  })
  return {
    call: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++seq,
          timer = setTimeout(() => reject(Error('CDP timeout ' + method)), 20000)
        pending.set(id, { resolve, reject, timer })
        socket.send(JSON.stringify({ id, method, params }))
      }),
    events,
    close: () => socket.close(),
  }
}
fs.mkdirSync(profile, { recursive: true })
fs.mkdirSync(batch + '/review', { recursive: true })
const chrome = spawn(
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
)
let browser, page
try {
  const active = profile + '/DevToolsActivePort'
  for (let i = 0; i < 150 && !fs.existsSync(active); i++) await delay(100)
  if (!fs.existsSync(active)) throw Error('Chrome did not start')
  const [cp, path] = fs.readFileSync(active, 'utf8').trim().split(/\r?\n/)
  browser = await connect(`ws://127.0.0.1:${cp}${path}`)
  const target = await browser.call('Target.createTarget', { url: 'about:blank' }),
    targets = await (await fetch(`http://127.0.0.1:${cp}/json/list`)).json()
  page = await connect(targets.find((t) => t.id === target.targetId).webSocketDebuggerUrl)
  await page.call('Page.enable')
  await page.call('WebAudio.enable')
  const evaluate = async (expression) => {
    const result = await page.call('Runtime.evaluate', { expression, returnByValue: true })
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const read = () =>
    evaluate(
      `({errors:window.towerDefenseQA?.errors,canvas:!!document.querySelector('canvas'),text:document.body.innerText,phaseLabel:document.querySelector('.td-wave strong')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,loading:document.body.innerText.includes('바다 성을 준비하고 있어요…')})`,
    )
  const click = async (text) => {
    const found = await evaluate(
      `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}||b.getAttribute('aria-label')===${JSON.stringify(text)});if(!b||b.disabled)return false;b.click();return true})()`,
    )
    if (!found) throw Error('Button unavailable ' + text)
    await delay(200)
  }
  const screenshot = async (name) => {
    const shot = await page.call('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(`${batch}/review/${name}.png`, Buffer.from(shot.data, 'base64'))
  }
  const point = async (col, row) =>
    evaluate(
      `(()=>{const r=document.querySelector('canvas').getBoundingClientRect(),e=window.towerDefenseQA.engine,p=e.SITES[e.cellAt(${col},${row})];return{x:r.x+p.x/e.FIELD.width*r.width,y:r.y+p.y/e.FIELD.height*r.height}})()`,
    )
  const hover = async (col, row) => {
    const p = await point(col, row)
    await page.call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p })
    await delay(250)
  }
  const pick = async (col, row) => {
    const p = await point(col, row)
    await page.call('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      ...p,
      button: 'left',
      clickCount: 1,
    })
    await page.call('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      ...p,
      button: 'left',
      clickCount: 1,
    })
    await delay(200)
  }
  await page.call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await page.call('Page.navigate', {
    url: `http://127.0.0.1:${port}/scripts/fixtures/tower-defense/index.html`,
  })
  await page.call('Page.bringToFront')
  for (let i = 0; i < 200; i++) {
    if ((await read()).text?.includes('연습 시작')) break
    await delay(100)
  }
  await screenshot('phone-lobby')
  await click('연습 시작')
  let status
  for (let i = 0; i < 300; i++) {
    status = await read()
    if (status.canvas && !status.loading) break
    await delay(100)
  }
  if (!status.canvas || status.loading || status.errors?.length)
    throw Error('Phaser failed ' + JSON.stringify(status))
  await pick(2, 10)
  if (!(await evaluate(`!!document.querySelector('[aria-label="연습 코인 180"]')`)))
    throw Error('Neutral map taps spent coins')
  const boardBefore = await evaluate(
    `(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()`,
  )
  const toolPoint = async (label) => {
    if (
      !(await evaluate(
        `[...document.querySelectorAll('[data-td-build-kind]')].some(b=>b.getAttribute('aria-label')===${JSON.stringify(label)})`,
      ))
    ) {
      await click('포탑 건설')
      await screenshot('phone-tower-catalog')
    }
    return evaluate(
      `(()=>{const b=[...document.querySelectorAll('[data-td-build-kind]')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(label)});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
    )
  }
  const tool = await toolPoint('문어포 90코인'),
    drop = await point(5, 6)
  await page.call('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...tool,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  })
  await page.call('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    ...drop,
    button: 'left',
    buttons: 1,
  })
  await delay(180)
  await screenshot('phone-drag-preview')
  if (!(await evaluate(`!!document.querySelector('[aria-label="연습 코인 180"]')`)))
    throw Error('Toolbar drag charged before release')
  await page.call('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    ...drop,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  })
  await delay(220)
  const boardAfter = await evaluate(
    `(()=>{const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})()`,
  )
  if (Object.keys(boardBefore).some((k) => Math.abs(boardBefore[k] - boardAfter[k]) > 0.5))
    throw Error('Placement resized the battlefield')
  if (!(await evaluate(`!!document.querySelector('.td-tools button[aria-pressed="true"]')`)))
    throw Error('Repeated placement mode was lost')
  await screenshot('phone-placement-feedback')
  if (!(await evaluate(`!!document.querySelector('[aria-label="연습 코인 90"]')`)))
    throw Error('Placement did not charge exactly once')
  await click('배치 취소')
  await pick(4, 11)
  await pick(5, 6)
  if (!(await evaluate(`!!document.querySelector('[aria-label="연습 코인 90"]')`)))
    throw Error('Selecting an existing tower repurchased it')
  await click('포탑 건설')
  await click('해마포 60코인')
  await pick(5, 8)
  const wallTool = await toolPoint('산호 벽 8코인')
  await page.call('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    ...wallTool,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  })
  await page.call('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 4,
    y: 4,
    button: 'left',
    buttons: 1,
  })
  await page.call('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 4,
    y: 4,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  })
  await delay(350)
  if (
    !(await evaluate(
      `!!document.querySelector('[aria-label="연습 코인 30"]')&&!document.querySelector('.td-tools button[aria-pressed="true"]')`,
    ))
  )
    throw Error('Outside drop was not cancelled')
  const wallDrop = await point(1, 8)
  await page.call('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...wallTool, id: 3 }],
  })
  await page.call('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...wallDrop, id: 3 }],
  })
  await delay(180)
  await screenshot('phone-touch-drag-preview')
  await page.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await delay(220)
  if (!(await evaluate(`!!document.querySelector('[aria-label="연습 코인 22"]')`)))
    throw Error('Touch drag did not place one wall')
  await screenshot('phone-touch-wall-placed')
  await click('배치 취소')
  await pick(1, 8)
  await click('판매 +4')
  if (!(await evaluate(`!!document.querySelector('[aria-label="연습 코인 26"]')`)))
    throw Error('Wall did not sell at half price')
  await screenshot('phone-ready')
  await click('1웨이브 시작')
  await delay(10000)
  await screenshot('phone-combat')
  const deadline = Date.now() + 65000
  while (Date.now() < deadline) {
    status = await read()
    if (status.phaseLabel?.startsWith('정비 ')) break
    if (status.text.includes('성의 불빛이 꺼졌어요'))
      throw Error('Starter placement failed first wave')
    if (!status.canvas) throw Error('The development page reloaded during the gameplay check')
    await delay(750)
  }
  if (!status.phaseLabel?.startsWith('정비 ')) throw Error('Wave 1 did not finish in time')
  await pick(5, 6)
  await click('강화 35')
  await click('성 강화 선택')
  await click('성 강화 60')
  await screenshot('phone-upgrades')
  // The turret centre is opaque in every firing frame. Rotated multi-texture
  // corruption used to erase this entire band after the first wave.
  const centre = await point(5, 8),
    screen = await page.call('Page.captureScreenshot', { format: 'png' }),
    shot = sharp(Buffer.from(screen.data, 'base64')),
    meta = await shot.metadata(),
    ratio = meta.width / 390
  const pixel = await shot
    .extract({
      left: Math.floor(centre.x * ratio),
      top: Math.floor(centre.y * ratio),
      width: 1,
      height: 1,
    })
    .raw()
    .toBuffer()
  if (pixel[0] >= 200 || pixel[1] >= 230)
    throw Error('Rotated seahorse centre was erased: ' + [...pixel])
  await pick(5, 6)
  const inspector = async () =>
    evaluate(`(()=>{
    const panel=document.querySelector('.td-tower-panel'),img=panel?.querySelector('img'),bounds=panel?.getBoundingClientRect();
    const buttons=[...(panel?.querySelectorAll('.td-tower-actions button')??[])];
    return {image:!!img?.naturalWidth,headers:[...(panel?.querySelectorAll('thead th')??[])].map(e=>e.textContent),fits:!!bounds&&buttons.every(b=>{const r=b.getBoundingClientRect();return r.bottom<=bounds.bottom+1&&r.right<=bounds.right+1}),cellsFit:[...(panel?.querySelectorAll('th,td')??[])].every(e=>e.scrollWidth<=e.clientWidth+1)}
  })()`)
  const inspectorChecks = []
  for (const [width, height] of [
    [390, 844],
    [360, 740],
    [320, 667],
  ]) {
    await page.call('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: true,
    })
    await delay(500)
    status = await read()
    if (status.overflow || status.errors?.length) throw Error('Phone layout failed ' + width)
    const comparison = await inspector()
    if (
      !comparison.image ||
      !comparison.fits ||
      !comparison.cellsFit ||
      comparison.headers.join('/') !== '능력치/현재/강화 후'
    )
      throw Error('Inspector layout failed ' + JSON.stringify(comparison))
    inspectorChecks.push({ width, ...comparison })
    await click('2배속 켜기')
    if (
      !(await evaluate(
        `document.querySelector('.td-speed')?.getAttribute('aria-pressed')==='true'`,
      ))
    )
      throw Error('Double speed toggle failed')
    await screenshot(`phone-inspector-${width}`)
    await click('2배속 끄기')
    await screenshot(`phone-${width}`)
  }
  await page.call('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await page.call('Page.navigate', {
    url: `http://127.0.0.1:${port}/scripts/fixtures/tower-defense/index.html?stress=1`,
  })
  await delay(16000)
  const stress = await evaluate(
    `(()=>{const q=window.towerDefenseQA,a=(q.frameIntervals??[]).slice(-300).sort((a,b)=>a-b);return{errors:q.errors,ready:q.ready,enemies:q.state?.enemies.length,stats:q.state?.stats,frameSamples:a.length,medianFrameMs:a[Math.floor(a.length*.5)],p95FrameMs:a[Math.floor(a.length*.95)],sprites:q.game?.scene.scenes[0]?.children.list.length,resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('/arcade/tower-defense/')).map(r=>r.name)}})()`,
  )
  if (!stress.ready || stress.errors.length || stress.enemies !== 256 || stress.frameSamples < 30)
    throw Error('Dense renderer failed ' + JSON.stringify(stress))
  await screenshot('phone-stress-256')
  await evaluate('window.towerDefenseQA.state.buildings.forEach(b=>{b.cooldown=0;b.charge=0})')
  let roster
  for (let n = 0; n < 100; n++) {
    roster = await evaluate(
      `(()=>{const q=window.towerDefenseQA,scene=q.game.scene.scenes[0];return{kinds:q.state.buildings.map(b=>b.kind),textures:[...scene.towers.values()].map(t=>t.texture.key),effects:q.state.effects.map(e=>e.kind),flaming:q.state.buildings.some(b=>b.kind==='flame'&&b.flash>0)}})()`,
    )
    if (
      roster.effects.includes('beam') &&
      roster.effects.includes('blast') &&
      roster.effects.includes('pulse') &&
      roster.flaming
    )
      break
    await delay(25)
  }
  if (
    roster.kinds.length !== 7 ||
    roster.textures.length !== 7 ||
    !roster.effects.includes('beam') ||
    !roster.effects.includes('blast') ||
    !roster.effects.includes('pulse') ||
    !roster.flaming
  )
    throw Error('Roster render effects failed ' + JSON.stringify(roster))
  await screenshot('phone-seven-towers-combat')
  await pick(4, 10)
  const beforeHit = await evaluate('window.towerDefenseQA.state.lives')
  await evaluate(
    `(()=>{const q=window.towerDefenseQA,e=q.state.enemies[0],p=q.engine.SITES[q.engine.HOME];Object.assign(e,{cell:q.engine.HOME,nav:q.engine.HOME,x:p.x,y:p.y,px:p.x,py:p.y,leak:1});return true})()`,
  )
  await delay(150)
  const breach = await evaluate(
    `(()=>{const q=window.towerDefenseQA,scene=q.game.scene.scenes[0];return{lives:q.state.lives,effect:q.state.effects.some(e=>e.kind==='breach'),tint:scene.castle.tintTopLeft}})()`,
  )
  if (breach.lives !== beforeHit - 1 || !breach.effect || breach.tint === 0xffffff)
    throw Error('Castle impact feedback missing ' + JSON.stringify(breach))
  await screenshot('phone-castle-impact')
  await evaluate('window.towerDefenseQA.selected=null')
  await evaluate(
    `(()=>{const q=window.towerDefenseQA;for(const b of q.state.buildings){b.flash=0;b.cooldown=Infinity;b.charge=0}return true})()`,
  )
  await delay(250)
  const towerPoses = () =>
    evaluate(
      `(()=>{const q=window.towerDefenseQA,scene=q.game.scene.scenes[0];return [...scene.towers.values()].map(t=>({x:t.x,y:t.y,rotation:t.rotation,frame:Number(t.frame.name)}))})()`,
    )
  const idleBefore = await towerPoses()
  await delay(500)
  const idleAfter = await towerPoses()
  if (
    JSON.stringify(idleBefore) !== JSON.stringify(idleAfter) ||
    idleAfter.some((t) => t.frame !== 0)
  )
    throw Error('Idle towers moved')
  await evaluate('window.towerDefenseQA.state.buildings.forEach(b=>b.cooldown=0)')
  await hover(4, 10)
  const preview = await evaluate(
    `(()=>{const q=window.towerDefenseQA,scene=q.game.scene.scenes[0],p=q.engine.SITES[q.engine.cellAt(4,10)],c=q.game.canvas;return{visible:scene.ghost.visible,x:scene.ghost.x,y:scene.ghost.y,expected:p,width:c.width,height:c.height,world:q.engine.FIELD,selected:q.selected,hovered:scene.hovered,pointer:{x:scene.input.activePointer.x,y:scene.input.activePointer.y},covered:scene.covered,rangeCommands:scene.marks.commandBuffer.length}})()`,
  )
  if (
    !preview.visible ||
    preview.x !== preview.expected.x ||
    preview.y !== preview.expected.y ||
    preview.width !== preview.world.width * 2
  )
    throw Error('Hover or high-density canvas failed ' + JSON.stringify(preview))
  await screenshot('phone-hover-retina')
  await pick(4, 10)
  const selected = await evaluate('window.towerDefenseQA.selected')
  if (selected !== 4 + 10 * 12) throw Error('High-density pointer selection failed')
  await evaluate('window.towerDefenseQA.engine.pauseDefense(window.towerDefenseQA.state,false)')
  const shotFrames = new Set()
  for (let i = 0; i < 50; i++) {
    const poses = await towerPoses()
    for (const t of poses) shotFrames.add(t.frame)
    await delay(60)
  }
  if (![0, 1, 2, 3].every((f) => shotFrames.has(f)))
    throw Error('Firing poses missing ' + [...shotFrames])
  const oldOrigin = await evaluate('performance.timeOrigin')
  await page.call('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await page.call('Page.reload')
  let reduced
  for (let attempt = 0; attempt < 200; attempt++) {
    reduced = await evaluate(
      '({origin:performance.timeOrigin,ready:window.towerDefenseQA?.ready,errors:window.towerDefenseQA?.errors,enemies:window.towerDefenseQA?.state?.enemies.length})',
    )
    if (reduced.origin !== oldOrigin && (reduced.ready || reduced.errors?.length)) break
    await delay(150)
  }
  if (!reduced.ready || reduced.errors?.length || reduced.enemies !== 256)
    throw Error('Reduced-motion failed ' + JSON.stringify(reduced))
  await delay(300)
  await screenshot('phone-stress-reduced')
  if (
    !page.events.some((e) => e.method === 'WebAudio.audioNodeCreated') ||
    !page.events.some((e) => e.params.context?.contextState === 'running')
  )
    throw Error('Audio did not unlock or synthesize feedback')
  await page.call('Page.navigate', {
    url: `http://127.0.0.1:${port}/scripts/fixtures/tower-defense/index.html?stress=1&dense=1`,
  })
  let dense
  for (let i = 0; i < 160; i++) {
    dense = await evaluate(
      '(()=>{const q=window.towerDefenseQA;return{ready:q?.ready,errors:q?.errors,enemies:q?.state?.enemies.length,towers:q?.state?.buildings.length,sprites:q?.game?.scene.scenes[0]?.towers?.size}})()',
    )
    // Scene creation signals readiness before its first update creates sprites.
    if (dense.ready && dense.sprites === 31) break
    await delay(150)
  }
  if (
    !dense.ready ||
    dense.errors.length ||
    dense.enemies !== 256 ||
    dense.towers !== 31 ||
    dense.sprites !== 31
  )
    throw Error('Dense towers failed ' + JSON.stringify(dense))
  await screenshot('phone-31-towers-256-enemies')
  const record = {
    verifiedAt: new Date().toISOString(),
    complete: true,
    scope:
      'Actual React UI and Phaser renderer, account-free local fixture; headless Chrome/software GPU timings are not physical mobile FPS.',
    phoneSizes: [
      [390, 844],
      [360, 740],
      [320, 667],
    ],
    firstWave: true,
    immediatePlacement: true,
    inspectorChecks,
    speedToggle: true,
    roster,
    toolbarDrag: true,
    touchDrag: true,
    repeatPlacement: true,
    placementCancellation: true,
    neutralTapsSafe: true,
    stableBattlefield: true,
    outsideDropCancelled: true,
    breach,
    audio: {
      contexts: page.events.filter((e) => e.method === 'WebAudio.contextCreated').length,
      nodes: page.events.filter((e) => e.method === 'WebAudio.audioNodeCreated').length,
      running: page.events.some((e) => e.params.context?.contextState === 'running'),
    },
    upgradeBadges: true,
    castleUpgrade: true,
    reducedMotion: true,
    idleStill: true,
    rotatedTurretIntact: true,
    firingFrames: [...shotFrames].sort(),
    hoverPreview: preview,
    stress,
    dense,
  }
  fs.writeFileSync(
    `${batch}/review/runtime-validation.json`,
    JSON.stringify(record, null, 2) + '\n',
  )
  console.log(JSON.stringify(record))
} finally {
  page?.close()
  if (browser) {
    await browser.call('Browser.close').catch(() => {})
    browser.close()
  } else chrome.kill()
}
