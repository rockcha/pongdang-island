import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import TowerDefenseGame from '@/features/arcade/tower-defense-game'
import type { DefenseState } from '@/features/arcade/tower-defense-engine'
import { build, cellAt, GRID, ROCKS } from '@/features/arcade/tower-defense-engine'

const scene = vi.hoisted(() => ({
  read: null as null | (() => DefenseState),
  pick: null as null | ((cell: number) => void),
  notify: null as null | (() => void),
  destroy: vi.fn(),
}))
vi.mock('@/features/arcade/tower-defense-scene', () => ({
  mountTowerDefense: (
    _host: HTMLElement,
    read: () => DefenseState,
    _selection: unknown,
    pick: (cell: number) => void,
    notify: () => void,
  ) => {
    scene.read = read
    scene.pick = pick
    scene.notify = notify
    notify()
    return { destroy: scene.destroy }
  },
}))
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  scene.read = null
  scene.pick = null
  scene.notify = null
})
async function start() {
  render(
    <MemoryRouter>
      <TowerDefenseGame />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '준비 완료 · 바로 시작' }).hasAttribute('disabled'),
    ).toBe(false),
  )
}

it('spends practice gold on placement, rejects invalid sites, and locks construction during combat', async () => {
  await start()
  act(() => scene.pick!(cellAt(14, 2)))
  expect(screen.getByLabelText('건설 골드 80')).toBeTruthy()
  act(() => scene.pick!([...ROCKS][0]))
  expect(screen.getByRole('alert').textContent).toContain('바위')
  expect(scene.read!().gold).toBe(80)
  fireEvent.click(screen.getByRole('button', { name: '산호 벽 10골드' }))
  act(() => scene.pick!(cellAt(15, 3)))
  expect(screen.getByLabelText('건설 골드 70')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '준비 완료 · 바로 시작' }))
  expect(scene.read!().phase).toBe('combat')
  expect(screen.getByRole('button', { name: '산호 벽 10골드' }).hasAttribute('disabled')).toBe(true)
  act(() => scene.pick!(cellAt(14, 3)))
  expect(scene.read!().buildings).toHaveLength(2)
})

it('pauses preparation when the window loses focus and destroys the renderer on confirmed exit', async () => {
  await start()
  fireEvent(window, new Event('blur'))
  expect(scene.read!().phase).toBe('paused')
  expect(screen.getByText('잠깐 쉬어가요')).toBeTruthy()
  fireEvent.click(
    within(screen.getByText('잠깐 쉬어가요').parentElement!).getByRole('button', {
      name: '계속하기',
    }),
  )
  expect(scene.read!().phase).toBe('build')
  fireEvent.click(screen.getByRole('button', { name: '게임 나가기' }))
  fireEvent.click(
    within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: '나가기',
      exact: true,
    }),
  )
  await waitFor(() => expect(scene.destroy).toHaveBeenCalledWith(true))
  expect(screen.queryByRole('application')).toBeNull()
})

it('explains a sealed path without spending gold and shows a wall without repair controls', async () => {
  await start()
  act(() => {
    const s = scene.read!()
    s.gold = 1000
    for (let col = 0; col < GRID.columns - 1; col++) build(s, cellAt(col, 8), 'wall')
    scene.notify!()
  })
  fireEvent.click(screen.getByRole('button', { name: '산호 벽 10골드' }))
  act(() => scene.pick!(cellAt(GRID.columns - 1, 8)))
  expect(screen.getByRole('alert').textContent).toContain('길을 완전히 막을 수 없어요')
  expect(screen.getByLabelText('건설 골드 830')).toBeTruthy()
  act(() => scene.pick!(cellAt(0, 8)))
  expect(screen.getByText('이동 경로 유도')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /강화|수리/ })).toBeNull()
  expect(screen.getByRole('button', { name: '판매 +7' })).toBeTruthy()
})

it('saves a completed practice locally and starts a clean run without remounting the scene', async () => {
  localStorage.setItem(
    'pongdang:tower-defense:practice-best:v1',
    JSON.stringify({ wave: 5, score: 99999, won: true }),
  )
  await start()
  const old = scene.read!()
  act(() => {
    old.wave = 5
    old.score = 5000
    old.kills = 180
    old.phase = 'won'
    scene.notify!()
  })
  expect(screen.getByText('조개금고를 지켰어요!')).toBeTruthy()
  expect(
    JSON.parse(localStorage.getItem('pongdang:tower-defense:practice-best:v2')!),
  ).toMatchObject({ wave: 5, score: 5000, won: true })
  expect(JSON.parse(localStorage.getItem('pongdang:tower-defense:practice-best:v1')!).score).toBe(
    99999,
  )
  fireEvent.click(screen.getByRole('button', { name: '다시 연습' }))
  expect(scene.read!()).not.toBe(old)
  expect(scene.read!()).toMatchObject({ phase: 'build', wave: 0, gold: 120, lives: 10, kills: 0 })
  expect(screen.queryByText('조개금고를 지켰어요!')).toBeNull()
})

it('ignores corrupt local records and remains playable when saving is unavailable', async () => {
  localStorage.setItem(
    'pongdang:tower-defense:practice-best:v2',
    '{"wave":999,"score":-10,"won":true}',
  )
  await start()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  act(() => Object.assign(scene.read!(), { phase: 'lost', wave: 1, score: 20 }))
  act(() => scene.notify!())
  expect(screen.getByText('다음엔 한 번 더 버텨봐요')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '다시 연습' }))
  expect(screen.getByLabelText('건설 골드 120')).toBeTruthy()
})

it('keeps the placed tower selected and updates the shown range after upgrading', async () => {
  await start()
  act(() => scene.pick!(cellAt(14, 2)))
  expect(screen.getByText('물총 조개 · Lv.1')).toBeTruthy()
  expect(screen.getByText('3칸')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '강화 40' }))
  expect(screen.getByText('물총 조개 · Lv.2')).toBeTruthy()
  expect(screen.getByText('3.3칸')).toBeTruthy()
  expect(screen.getByLabelText('건설 골드 40')).toBeTruthy()
})

it('waits in portrait mode without spending preparation time and resumes after rotation', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: window.innerWidth < window.innerHeight }))
  vi.stubGlobal('innerWidth', 390)
  vi.stubGlobal('innerHeight', 844)
  render(
    <MemoryRouter>
      <TowerDefenseGame />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: '연습 시작' }))
  expect(screen.getByText('가로로 넓게 플레이해요')).toBeTruthy()
  await waitFor(() => expect(scene.read).not.toBeNull())
  expect(scene.read!()).toMatchObject({ phase: 'paused', prep: 30 })
  expect(screen.getByRole('application').closest('.tdp-board')?.hasAttribute('inert')).toBe(true)
  vi.stubGlobal('innerWidth', 844)
  vi.stubGlobal('innerHeight', 390)
  act(() => window.dispatchEvent(new Event('resize')))
  expect(screen.queryByText('가로로 넓게 플레이해요')).toBeNull()
  fireEvent.click(
    within(screen.getByText('잠깐 쉬어가요').parentElement!).getByRole('button', {
      name: '계속하기',
    }),
  )
  expect(scene.read!()).toMatchObject({ phase: 'build', prep: 30 })
})
