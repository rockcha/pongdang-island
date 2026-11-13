import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import TowerDefenseGame from '@/features/arcade/tower-defense-game'
import { stepDefense, type DefenseState } from '@/features/arcade/tower-defense-engine'
import { clearedTowerStages } from '@/features/arcade/tower-defense-replay'
import { appQueryClient, setQueryAccount } from '@/lib/account-cache'
const mocks = vi.hoisted(() => ({
  auth: { session: { user: { id: 'tower-player' } }, recovery: false },
  start: vi.fn(),
  save: vi.fn(),
  read: vi.fn(),
  wallet: vi.fn(),
  scene: { read: null as null | (() => DefenseState), notify: null as null | (() => void) },
}))
vi.mock('@/components/auth-provider', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/features/gold/api', () => ({ readGold: (signal: AbortSignal) => mocks.wallet(signal) }))
vi.mock('@/features/arcade/tower-defense-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/arcade/tower-defense-api')>()),
  readTowerDefense: (signal: AbortSignal) => mocks.read(signal),
  startTowerDefense: (id: string) => mocks.start(id),
  saveTowerDefense: (...args: unknown[]) => mocks.save(...args),
}))
vi.mock('@/features/arcade/tower-defense-scene', () => ({
  mountTowerDefense: (
    _host: unknown,
    read: () => DefenseState,
    _select: unknown,
    _pick: unknown,
    notify: () => void,
  ) => {
    Object.assign(mocks.scene, { read, notify })
    notify()
    return { destroy: vi.fn() }
  },
}))
const run = () => ({
  id: '00000000-0000-4000-8000-000000007291',
  seed: 42,
  engine_version: 1,
  cleared_stage: 0,
  reward: 0,
  replay: { version: 1, ticks: 0, commands: [] },
  started_at: new Date().toISOString(),
  achieved_at: null,
  finished_at: null,
  abandoned: false,
})
const snapshot = (r: any = null, gold = 1000) => ({
  serverNow: new Date().toISOString(),
  enabled: true,
  run: r,
  wallet: { gold, inventory: {}, testEnabled: false, testClaimed: false },
})
beforeEach(() => {
  setQueryAccount('tower-player')
  mocks.start.mockReset()
  mocks.save.mockReset()
  mocks.read.mockResolvedValue(snapshot())
  mocks.wallet.mockResolvedValue(snapshot().wallet)
  mocks.start.mockResolvedValue(snapshot(run(), 970))
})
afterEach(() => {
  cleanup()
  setQueryAccount(null)
  appQueryClient.clear()
  mocks.scene.read = null
  mocks.scene.notify = null
})
function setup() {
  render(
    <MemoryRouter>
      <TowerDefenseGame />
    </MemoryRouter>,
  )
}
async function enter() {
  setup()
  fireEvent.click(await screen.findByRole('button', { name: '실전 (골드 30)' }))
  await waitFor(() => expect(mocks.scene.read).not.toBeNull())
}
it('reuses the exact entry operation after an uncertain response, shows only construction coins and locks practice wave selection', async () => {
  mocks.start.mockRejectedValueOnce(Error('network'))
  setup()
  fireEvent.click(await screen.findByRole('button', { name: '실전 (골드 30)' }))
  fireEvent.click(await screen.findByRole('button', { name: '참가 결과 다시 확인' }))
  await waitFor(() => expect(mocks.scene.read).not.toBeNull())
  expect(mocks.start.mock.calls[0][0]).toBe(mocks.start.mock.calls[1][0])
  expect(screen.queryByLabelText('보유 골드 1000')).toBeNull()
  expect(screen.getByLabelText('건설 코인 180')).toBeTruthy()
  expect(mocks.wallet).not.toHaveBeenCalled()
  expect(screen.queryByRole('combobox', { name: '시작 웨이브' })).toBeNull()
  expect(mocks.scene.read!().gold).toBe(180)
})
it('pauses on an uncertain stage payout, retries the identical replay and resumes only after confirmation', async () => {
  mocks.save
    .mockRejectedValueOnce(Error('network'))
    .mockImplementationOnce(async (_id, replay) =>
      snapshot({ ...run(), cleared_stage: 1, reward: 10, replay }, 980),
    )
  await enter()
  fireEvent.click(screen.getByRole('button', { name: '지금 보내기' }))
  act(() => {
    const s = mocks.scene.read!()
    for (let i = 0; i < 2000 && clearedTowerStages(s) < 1; i++) stepDefense(s, 0.05)
    expect(clearedTowerStages(s)).toBe(1)
    mocks.scene.notify!()
  })
  const retry = await screen.findByRole('button', { name: '저장 결과 다시 확인' })
  expect(mocks.scene.read!().phase).toBe('paused')
  expect(mocks.save).toHaveBeenCalledTimes(1)
  fireEvent.click(retry)
  await screen.findByText('1스테이지 통과 · 10골드 지급')
  expect(mocks.save.mock.calls[0]).toEqual(mocks.save.mock.calls[1])
  expect(mocks.save.mock.calls[0][1].commands).toEqual([{ type: 'wave', tick: 0 }])
  expect(mocks.scene.read!().phase).toBe('build')
})
it('does not open a paid game after an account switch while entry is pending', async () => {
  let resolve!: (data: unknown) => void
  mocks.start.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  setup()
  fireEvent.click(await screen.findByRole('button', { name: '실전 (골드 30)' }))
  setQueryAccount('someone-else')
  await act(async () => {
    resolve(snapshot(run(), 970))
  })
  expect(mocks.scene.read).toBeNull()
})
