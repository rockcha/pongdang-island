import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import TowerDefenseGame from '@/features/arcade/tower-defense-game'
import {
  FIELD,
  HOME,
  ENTRANCES,
  SITES,
  cellAt,
  spawnEnemy,
  startWave,
  stepDefense,
  configureStartingWave,
  type DefenseState,
} from '@/features/arcade/tower-defense-engine'
const scene = vi.hoisted(() => ({
  read: null as null | (() => DefenseState),
  pick: null as null | ((cell: number) => void),
  notify: null as null | (() => void),
  paint: null as null | ((cell: number) => void),
  destroy: vi.fn(),
}))
vi.mock('@/features/arcade/tower-defense-scene', () => ({
  mountTowerDefense: (
    _host: unknown,
    read: () => DefenseState,
    _selected: unknown,
    pick: (cell: number) => void,
    notify: () => void,
    _tool: unknown,
    _error: unknown,
    _drag: unknown,
    paint: (cell: number) => void,
  ) => {
    const canvas = document.createElement('canvas')
    ;(_host as HTMLElement).appendChild(canvas)
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 100,
      width: FIELD.width,
      height: FIELD.height,
      right: FIELD.width,
      bottom: FIELD.height + 100,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    })
    Object.assign(scene, { read, pick, notify, paint })
    notify()
    return { destroy: scene.destroy }
  },
}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  scene.read = null
  scene.pick = null
  scene.notify = null
  scene.paint = null
})
async function start() {
  render(
    <MemoryRouter>
      <TowerDefenseGame />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '지금 보내기' }).hasAttribute('disabled')).toBe(
      false,
    ),
  )
}
function openCatalog() {
  fireEvent.click(screen.getByRole('button', { name: '포탑 건설', exact: true }))
}
it('shares the arcade start menu while disabling real play and keeping weekly ranking in preparation', async () => {
  render(
    <MemoryRouter>
      <TowerDefenseGame />
    </MemoryRouter>,
  )
  const paid = screen.getByRole('button', { name: '실전 · 준비 중' })
  expect((paid as HTMLButtonElement).disabled).toBe(true)
  expect(document.querySelector('img[src="/arcade/tower-defense/poster-v1.webp"]')).toBeTruthy()
  fireEvent.click(paid)
  expect(scene.read).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: '랭킹' }))
  expect(screen.getByRole('heading', { name: '주간 랭킹 준비 중' })).toBeTruthy()
  expect(scene.read).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '연습하러 가기' }))
  fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
  await waitFor(() => expect(scene.read).not.toBeNull())
  expect(
    screen.getByRole('dialog', { name: '퐁이의 타워디펜스' }).getAttribute('data-layout'),
  ).toBe('contained')
  expect(scene.read!().gold).toBe(180)
})
it('paints walls across occupied tiles without changing the tool or charging twice, and stops on cancel', async () => {
  await start()
  fireEvent.click(screen.getByRole('button', { name: '산호 벽 8코인' }))
  act(() => {
    scene.paint!(cellAt(2, 8))
    scene.paint!(cellAt(3, 8))
    scene.paint!(cellAt(2, 8))
  })
  expect(scene.read!().buildings).toHaveLength(2)
  expect(scene.read!().gold).toBe(164)
  expect(screen.getByRole('button', { name: '배치 취소' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '배치 취소' }))
  act(() => scene.paint!(cellAt(4, 8)))
  expect(scene.read!().buildings).toHaveLength(2)
  expect(scene.read!().gold).toBe(164)
})
it('starts automatically after the countdown without a stage selector and resets to wave one on retry', async () => {
  await start()
  expect(screen.queryByRole('combobox', { name: '시작 웨이브' })).toBeNull()
  expect(screen.getByText('1웨이브 · 30초 후 시작')).toBeTruthy()
  act(() => {
    for (let i = 0; i < 601; i++) stepDefense(scene.read!(), 0.05)
    scene.notify!()
  })
  expect(scene.read!().wave).toBe(1)
  expect(scene.read!().phase).toBe('combat')
  act(() => {
    scene.read!().phase = 'lost'
    scene.notify!()
  })
  fireEvent.click(screen.getByRole('button', { name: '다시 연습' }))
  expect(screen.getByText('1웨이브 · 30초 후 시작')).toBeTruthy()
  expect(scene.read!().wave).toBe(0)
})
it('keeps the stage free of a fixed boss health overlay', async () => {
  await start()
  act(() => {
    const s = scene.read!()
    s.wave = 9
    startWave(s)
    spawnEnemy(s, 'boss')
    s.enemies[0].shield = 250
    scene.notify!()
  })
  expect(screen.queryByRole('status', { name: '왕관 대왕게 체력 2250/2250' })).toBeNull()
  expect(screen.queryByText(/보호막 250/)).toBeNull()
  expect(screen.getByRole('button', { name: '포탑 건설', exact: true })).toBeTruthy()
})
function chooseTower(name: string) {
  openCatalog()
  fireEvent.click(screen.getByRole('button', { name }))
}
it('paints multiple towers without switching tools or purchasing occupied cells again', async () => {
  await start()
  act(() => {
    configureStartingWave(scene.read!(), 50)
    scene.notify!()
  })
  chooseTower('문어포 90코인')
  const gold = scene.read!().gold
  act(() => {
    scene.paint!(cellAt(2, 8))
    scene.paint!(cellAt(3, 8))
    scene.paint!(cellAt(2, 8))
  })
  expect(scene.read!().buildings).toHaveLength(2)
  expect(scene.read!().gold).toBe(gold - 180)
  fireEvent.click(screen.getByRole('button', { name: '배치 취소' }))
  act(() => scene.paint!(cellAt(4, 8)))
  expect(scene.read!().buildings).toHaveLength(2)
})
it('moves an upgraded tower without spending coins and cancels further relocation with Escape', async () => {
  await start()
  chooseTower('문어포 90코인')
  const from = cellAt(2, 8),
    to = cellAt(4, 8)
  act(() => scene.pick!(from))
  act(() => scene.pick!(from))
  fireEvent.click(screen.getByRole('button', { name: '강화 35' }))
  const gold = scene.read!().gold
  fireEvent.click(screen.getByRole('button', { name: '이동', exact: true }))
  act(() => scene.pick!(HOME))
  expect(scene.read!().buildings[0].cell).toBe(from)
  expect(screen.getByRole('button', { name: '이동 취소' })).toBeTruthy()
  act(() => scene.pick!(to))
  expect(scene.read!().buildings[0]).toMatchObject({ cell: to, level: 1 })
  expect(scene.read!().gold).toBe(gold)
  fireEvent.click(screen.getByRole('button', { name: '이동', exact: true }))
  fireEvent.keyDown(window, { key: 'Escape' })
  act(() => scene.pick!(cellAt(6, 8)))
  expect(scene.read!().buildings[0].cell).toBe(to)
})
it('installs immediately, selects existing towers without repurchasing and exposes upgrades', async () => {
  await start()
  act(() => scene.pick!(cellAt(2, 11)))
  expect(scene.read!().gold).toBe(180)
  chooseTower('문어포 90코인')
  act(() => scene.pick!(cellAt(2, 11)))
  expect(screen.queryByRole('button', { name: '설치 90' })).toBeNull()
  act(() => scene.pick!(cellAt(2, 11)))
  expect(scene.read!().gold).toBe(90)
  expect(scene.read!().buildings).toHaveLength(1)
  expect(
    screen.getByRole('button', { name: '포탑 건설', exact: true }).getAttribute('aria-pressed'),
  ).toBe('false')
  act(() => scene.pick!(cellAt(4, 11)))
  expect(scene.read!().gold).toBe(90)
  act(() => scene.pick!(cellAt(2, 11)))
  fireEvent.click(screen.getByRole('button', { name: '강화 35' }))
  expect(scene.read!().buildings[0].level).toBe(1)
  fireEvent.click(screen.getByRole('button', { name: '능력치 보기' }))
  const comparison = await screen.findByRole('table', { name: '문어포 강화 능력치 비교' })
  const attack = within(comparison).getByRole('row', { name: /공격력/ })
  expect(within(attack).getByText('40.5')).toBeTruthy()
  expect(within(attack).getByText('55.5')).toBeTruthy()
  expect(within(comparison).getByRole('columnheader', { name: /^현재/ })).toBeTruthy()
  expect(within(comparison).getByRole('columnheader', { name: /^강화 후/ })).toBeTruthy()
  expect(document.querySelector('.td-tower-portrait img')?.getAttribute('src')).toContain(
    'octopus-v5.svg',
  )
})
it('toggles double speed through pause and resets to normal for a new practice', async () => {
  await start()
  fireEvent.click(screen.getByRole('button', { name: '2배속 켜기' }))
  expect(scene.read!().playbackRate).toBe(2)
  expect(screen.getByRole('button', { name: '2배속 끄기' }).getAttribute('aria-pressed')).toBe(
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
  expect(scene.read!().playbackRate).toBe(2)
  fireEvent.click(screen.getByRole('button', { name: '2배속 끄기' }))
  expect(scene.read!().playbackRate).toBe(1)
  fireEvent.click(screen.getByRole('button', { name: '2배속 켜기' }))
  act(() => {
    scene.read!().phase = 'lost'
    scene.notify!()
  })
  fireEvent.click(screen.getByRole('button', { name: '다시 연습' }))
  expect(scene.read!().playbackRate).toBe(1)
})
it('lets players build during combat, upgrade the castle and pause from portrait mode', async () => {
  await start()
  fireEvent.click(screen.getByRole('button', { name: '지금 보내기' }))
  expect(scene.read!().phase).toBe('combat')
  chooseTower('해마포 60코인')
  act(() => scene.pick!(cellAt(6, 11)))
  expect(scene.read!().buildings).toHaveLength(1)
  act(() => scene.pick!(HOME))
  fireEvent.click(screen.getByRole('button', { name: '성 강화 60' }))
  expect(scene.read!().maxLives).toBe(20)
  fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
  expect(scene.read!().phase).toBe('paused')
  fireEvent.click(
    within(screen.getByRole('heading', { name: '잠깐 쉬어가요' }).parentElement!).getByRole(
      'button',
      { name: '계속하기', exact: true },
    ),
  )
  expect(scene.read!().phase).toBe('combat')
  expect(screen.queryByText(/가로로 돌려/)).toBeNull()
})
it('destroys the Phaser scene only after confirming exit', async () => {
  await start()
  fireEvent.click(screen.getByRole('button', { name: '게임 나가기' }))
  fireEvent.click(
    within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: '나가기',
      exact: true,
    }),
  )
  await waitFor(() => expect(scene.destroy).toHaveBeenCalledWith(true))
})

it('sells for half of the invested coins and rejects blocked or unaffordable placements', async () => {
  await start()
  chooseTower('문어포 90코인')
  act(() => scene.pick!(ENTRANCES[0]))
  expect(scene.read!().buildings).toHaveLength(0)
  act(() => scene.pick!(cellAt(3, 11)))
  act(() => scene.pick!(cellAt(3, 11)))
  fireEvent.click(screen.getByRole('button', { name: '판매 +45' }))
  expect(scene.read!().gold).toBe(135)
  expect(scene.read!().buildings).toHaveLength(0)
  chooseTower('문어포 90코인')
  act(() => scene.pick!(cellAt(3, 11)))
  act(() => scene.pick!(cellAt(4, 11)))
  expect(scene.read!().buildings).toHaveLength(1)
  expect(scene.read!().gold).toBe(45)
  openCatalog()
  expect(
    (screen.getByRole('button', { name: '문어포 90코인' }) as HTMLButtonElement).disabled,
  ).toBe(true)
})

it('keeps the same tower armed across purchases and insufficient funds until explicitly cancelled', async () => {
  await start()
  chooseTower('해마포 60코인')
  for (const x of [2, 4, 6]) {
    act(() => scene.pick!(cellAt(x, 10)))
    expect(screen.getByRole('button', { name: '배치 취소' })).toBeTruthy()
  }
  expect(scene.read!().buildings).toHaveLength(3)
  expect(scene.read!().gold).toBe(0)
  act(() => scene.pick!(cellAt(8, 10)))
  expect(scene.read!().buildings).toHaveLength(3)
  expect(screen.getByRole('alert').textContent).toContain('부족')
  expect(screen.getByRole('button', { name: '배치 취소' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '배치 취소' }))
  act(() => {
    scene.read!().gold = 100
    scene.notify!()
  })
  act(() => scene.pick!(cellAt(8, 10)))
  expect(scene.read!().buildings).toHaveLength(3)
  expect(scene.read!().gold).toBe(100)
})

it('keeps drag-placed towers armed for the next tap and lets Escape cancel the repeat mode', async () => {
  await start()
  openCatalog()
  const button = screen.getByRole('button', { name: '문어포 90코인' })
  pointer(button, 'pointerdown', 30, 700)
  pointer(window, 'pointermove', SITES[cellAt(3, 11)].x, SITES[cellAt(3, 11)].y + 100)
  pointer(window, 'pointerup', SITES[cellAt(3, 11)].x, SITES[cellAt(3, 11)].y + 100)
  expect(screen.getByRole('button', { name: '배치 취소' })).toBeTruthy()
  act(() => scene.pick!(cellAt(5, 11)))
  expect(scene.read!().buildings).toHaveLength(2)
  expect(scene.read!().gold).toBe(0)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.queryByRole('button', { name: '배치 취소' })).toBeNull()
  expect(screen.queryByRole('alertdialog')).toBeNull()
})

function pointer(target: EventTarget, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  fireEvent(target, event)
}
it('cancels placement with Escape without spending or opening the exit dialog', async () => {
  await start()
  chooseTower('문어포 90코인')
  expect(screen.getByRole('button', { name: '배치 취소' })).toBeTruthy()
  fireEvent.keyDown(window, { key: 'Escape' })
  act(() => scene.pick!(cellAt(3, 11)))
  expect(scene.read!().gold).toBe(180)
  expect(screen.queryByRole('alertdialog')).toBeNull()
})
it('drags a toolbar item onto the map once and cancels an outside drop', async () => {
  await start()
  openCatalog()
  const button = screen.getByRole('button', { name: '문어포 90코인' })
  pointer(button, 'pointerdown', 30, 700)
  pointer(window, 'pointermove', SITES[cellAt(3, 11)].x, SITES[cellAt(3, 11)].y + 100)
  expect(scene.read!().gold).toBe(180)
  pointer(window, 'pointerup', SITES[cellAt(3, 11)].x, SITES[cellAt(3, 11)].y + 100)
  expect(scene.read!().gold).toBe(90)
  expect(scene.read!().buildings[0].cell).toBe(cellAt(3, 11))
  openCatalog()
  const second = screen.getByRole('button', { name: '문어포 90코인' })
  pointer(second, 'pointerdown', 30, 700)
  pointer(window, 'pointermove', -10, 500)
  pointer(window, 'pointerup', -10, 500)
  expect(scene.read!().gold).toBe(90)
  expect(scene.read!().buildings).toHaveLength(1)
  expect(screen.queryByRole('button', { name: '배치 취소' })).toBeNull()
})

it('offers all thirteen towers and gates expensive purchases by available coins', async () => {
  await start()
  openCatalog()
  const catalog = screen.getByRole('group', { name: '포탑 선택' })
  expect(within(catalog).getAllByRole('button')).toHaveLength(13)
  expect(
    (screen.getByRole('button', { name: '월광 순항미사일 기지 550코인' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  expect(
    (screen.getByRole('button', { name: '진주 레이저 260코인' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  act(() => {
    scene.read!().gold = 1000
    scene.notify!()
  })
  fireEvent.click(screen.getByRole('button', { name: '진주 레이저 260코인' }))
  act(() => scene.pick!(cellAt(4, 8)))
  expect(scene.read!().buildings[0].kind).toBe('laser')
  expect(scene.read!().gold).toBe(740)
  expect(screen.queryByRole('group', { name: '포탑 선택' })).toBeNull()
})

it.each([
  ['산호 유도미사일', 'missile', 120, '공중 전용'],
  ['불가사리 다연장 미사일', 'salvo', 220, '공중 전용'],
  ['진주 저격탑', 'sniper', 320, '지상·공중'],
  ['작살 가재포', 'harpoon', 240, '지상·공중'],
  ['빙결 산호탑', 'frost', 160, '감속'],
] as const)('places and inspects %s through the build catalog', async (name, kind, cost, badge) => {
  await start()
  act(() => {
    scene.read!().gold = 1000
    scene.notify!()
  })
  openCatalog()
  const button = screen.getByRole('button', { name: `${name} ${cost}코인` })
  expect(within(button).getByText(badge)).toBeTruthy()
  fireEvent.click(button)
  act(() => scene.pick!(cellAt(6, 10)))
  expect(scene.read!().buildings[0].kind).toBe(kind)
  expect(scene.read!().gold).toBe(1000 - cost)
  fireEvent.click(screen.getByRole('button', { name: '배치 취소' }))
  act(() => scene.pick!(cellAt(6, 10)))
  fireEvent.click(screen.getByRole('button', { name: '능력치 보기' }))
  const stats = await screen.findByRole('table', { name: `${name} 강화 능력치 비교` })
  expect(stats).toBeTruthy()
  expect(within(await screen.findByRole('alertdialog')).getByText(badge)).toBeTruthy()
})

it('announces air enemy names and counts before starting a flying wave', async () => {
  await start()
  act(() => {
    configureStartingWave(scene.read!(), 8)
    scene.notify!()
  })
  expect(screen.getByText('공중')).toBeTruthy()
  expect(screen.getByRole('img', { name: '하늘 날치' })).toBeTruthy()
  expect(screen.getByRole('listitem', { name: '하늘 날치 2마리 · 공중' })).toBeTruthy()
  expect(screen.getByRole('img', { name: '조개투구 소라게' })).toBeTruthy()
  expect(screen.getByText(/공중 하늘 날치 등장/)).toBeTruthy()
})

it('opens castle upgrades from health and hides build panels while paused', async () => {
  await start()
  const health = screen.getByRole('button', { name: '성 체력 15/15 · 성 강화 선택' })
  expect(health.closest('.td-hud')).toBeNull()
  expect(health.closest('.td-stage-wrap')).toBeTruthy()
  expect(
    within(screen.getByRole('group', { name: '건설 도구' })).getAllByRole('button'),
  ).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: '성 체력 15/15 · 성 강화 선택' }))
  fireEvent.click(screen.getByRole('button', { name: '성 강화 60' }))
  expect(scene.read!().maxLives).toBe(20)
  fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
  expect(screen.queryByRole('group', { name: '건설 도구' })).toBeNull()
  expect(screen.queryByRole('button', { name: '성 강화 120' })).toBeNull()
  fireEvent.click(
    within(screen.getByRole('heading', { name: '잠깐 쉬어가요' }).parentElement!).getByRole(
      'button',
      { name: '계속하기', exact: true },
    ),
  )
  expect(screen.getByRole('button', { name: '성 강화 120' })).toBeTruthy()
})

it('filters the purchase modal by target layer and sorts every view by price', async () => {
  await start()
  openCatalog()
  expect(screen.getByRole('dialog', { name: '포탑 구매' })).toBeTruthy()
  const kinds = () =>
    within(screen.getByRole('group', { name: '포탑 선택' }))
      .getAllByRole('button')
      .map((button) => button.getAttribute('data-td-build-kind'))
  expect(kinds()).toEqual([
    'seahorse',
    'octopus',
    'anemone',
    'missile',
    'flame',
    'frost',
    'mortar',
    'salvo',
    'plasma',
    'harpoon',
    'laser',
    'sniper',
    'cruise',
  ])
  fireEvent.click(screen.getByRole('button', { name: '공중', exact: true }))
  expect(kinds()).toEqual(['missile', 'salvo', 'harpoon', 'sniper', 'cruise'])
  fireEvent.click(screen.getByRole('button', { name: '지상', exact: true }))
  expect(kinds()).toEqual([
    'seahorse',
    'octopus',
    'anemone',
    'flame',
    'frost',
    'mortar',
    'plasma',
    'harpoon',
    'laser',
    'sniper',
    'cruise',
  ])
  fireEvent.click(screen.getByRole('button', { name: '전체', exact: true }))
  expect(kinds()).toHaveLength(13)
  fireEvent.keyDown(window, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: '포탑 구매' })).toBeNull()
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: '포탑 건설', exact: true }),
  )
})
