import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PersonalBaitWorkshopPage } from '@/features/production/personal-bait-workshop-page'
import { personalBaitFuel, type PersonalBaitState } from '@/features/production/personal-bait-api'
const mock = vi.hoisted(() => ({
  load: vi.fn(),
  action: vi.fn(),
  refresh: vi.fn(),
  sound: vi.fn(),
  fishing: vi.fn(),
}))
vi.mock('@/features/fishing/api', () => ({ loadFishing: mock.fishing }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'workshop-test' } } }),
}))
vi.mock('@/features/gold/gold-provider', () => ({ useGold: () => ({ refresh: mock.refresh }) }))
vi.mock('@/features/gold/purchase-sound', () => ({ playRewardSound: mock.sound }))
vi.mock('@/features/production/personal-bait-api', async (original) => ({
  ...(await original<any>()),
  loadPersonalBaitWorkshop: mock.load,
  actPersonalBaitWorkshop: mock.action,
}))
const make = (): PersonalBaitState => ({
  serverNow: new Date().toISOString(),
  fuel: 2000,
  limits: { maxQuantity: 100, minMinutes: 30, maxMinutes: 720, stepMinutes: 30, maxActive: 1 },
  baits: [
    { id: 'bait', name: '퐁당 지렁이', imagePath: '/worm.png', unitValue: 50, owned: 7 },
    { id: 'sachet', name: '깊은잠 향낭', imagePath: '/sachet.png', unitValue: 361, owned: 3 },
  ],
  job: null,
})
function job(ready = false) {
  return {
    id: 'job-test',
    baitId: 'bait',
    baitName: '퐁당 지렁이',
    imagePath: '/worm.png',
    quantity: 10,
    minutes: 30,
    unitValue: 50,
    fuelCost: 8,
    startedAt: new Date(Date.now() - (ready ? 3600000 : 1000)).toISOString(),
    completesAt: new Date(Date.now() + (ready ? -1800000 : 1799000)).toISOString(),
  }
}
function mount() {
  return render(
    <MemoryRouter>
      <PersonalBaitWorkshopPage />
    </MemoryRouter>,
  )
}
beforeEach(() => {
  localStorage.clear()
  mock.load.mockReset().mockResolvedValue(make())
  mock.action.mockReset()
  mock.refresh.mockResolvedValue(undefined)
  mock.fishing.mockReset().mockResolvedValue({
    baits: [
      {
        id: 'bait',
        name: '퐁당 지렁이',
        effect_description: '기본 미끼 효과',
        description: '기본 미끼',
        effect_kind: 'fish',
        common_bp: 10000,
        rare_bp: 0,
        epic_bp: 0,
        mythic_bp: 0,
        mechanicsVersion: 2,
      },
      {
        id: 'sachet',
        name: '깊은잠 향낭',
        effect_description: '희귀 등급의 바다 손님을 불러요.',
        description: '향낭',
        effect_kind: 'fish',
        common_bp: 0,
        rare_bp: 10000,
        epic_bp: 0,
        mythic_bp: 0,
        mechanicsVersion: 2,
      },
    ],
  })
})
afterEach(cleanup)
it('quotes endpoints and rejects invalid quantities or time outside the production rules', () => {
  expect(personalBaitFuel(50, 10, 30)).toBe(8)
  expect(personalBaitFuel(50, 100, 720)).toBe(58)
  expect(personalBaitFuel(361, 100, 30)).toBe(578)
  expect(personalBaitFuel(361, 100, 720)).toBe(413)
  for (const n of [0, 101, 1.5, NaN]) expect(personalBaitFuel(50, n, 30)).toBeNull()
  for (const n of [0, 31, 750]) expect(personalBaitFuel(50, 10, n)).toBeNull()
  for (let minutes = 60; minutes <= 720; minutes += 30)
    expect(personalBaitFuel(361, 100, minutes)).toBeLessThanOrEqual(
      personalBaitFuel(361, 100, minutes - 30)!,
    )
})
it('updates the quote instantly, validates quantity, and searches premium bait', async () => {
  mount()
  await screen.findByRole('button', { name: '생산 시작 (연료 8)' })
  fireEvent.change(screen.getByRole('spinbutton', { name: '생산 수량' }), {
    target: { value: '100' },
  })
  fireEvent.change(screen.getByRole('slider', { name: '소요 시간' }), { target: { value: '720' } })
  expect(screen.getByRole('slider', { name: '소요 시간' }).getAttribute('aria-valuetext')).toBe(
    '12시간',
  )
  expect(screen.queryByRole('button', { name: '12시간' })).toBeNull()
  expect(screen.getByRole('button', { name: '생산 시작 (연료 58)' })).toBeTruthy()
  fireEvent.change(screen.getByRole('spinbutton', { name: '생산 수량' }), {
    target: { value: '101' },
  })
  expect(
    screen.getByRole('button', { name: '수량을 확인해 주세요' }).hasAttribute('disabled'),
  ).toBe(true)
  fireEvent.change(screen.getByRole('spinbutton', { name: '생산 수량' }), {
    target: { value: '100' },
  })
  fireEvent.click(screen.getByRole('button', { name: /퐁당 지렁이.*보유/ }))
  fireEvent.change(screen.getByRole('textbox', { name: '미끼 검색' }), {
    target: { value: '향낭' },
  })
  fireEvent.click(screen.getByRole('button', { name: /깊은잠 향낭.*보유/ }))
  expect(screen.getByRole('button', { name: '생산 시작 (연료 413)' })).toBeTruthy()
  expect(screen.queryByText(/개 절약/)).toBeNull()
  expect(mock.action).not.toHaveBeenCalled()
})
it('shows current odds directly without descriptions or an info dialog', async () => {
  mount()
  await screen.findByRole('list', { name: '등급 확률' })
  expect(screen.getByText('100%')).toBeTruthy()
  expect(screen.queryByText('기본 미끼 효과')).toBeNull()
  expect(screen.queryByRole('button', { name: /효과 자세히 보기/ })).toBeNull()
})
it('allows production when effect lookup fails and retries effect loading separately', async () => {
  mock.fishing.mockRejectedValueOnce(new Error('offline'))
  mount()
  await screen.findByRole('button', { name: '확률 다시 불러오기' })
  expect(
    screen.getByRole('button', { name: '생산 시작 (연료 8)' }).hasAttribute('disabled'),
  ).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '확률 다시 불러오기' }))
  await screen.findByRole('list', { name: '등급 확률' })
})
it('paginates bait choices and resets the page when searching', async () => {
  const data = make()
  data.baits = Array.from({ length: 9 }, (_, i) => ({
    ...data.baits[0],
    id: 'choice-' + i,
    name: '미끼 ' + i,
  }))
  mock.load.mockResolvedValue(data)
  mount()
  fireEvent.click(await screen.findByRole('button', { name: /미끼 0.*보유/ }))
  expect(screen.getByRole('button', { name: '이전 미끼 목록' }).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: '다음 미끼 목록' }))
  expect(screen.getByRole('button', { name: /미끼 4.*보유/ })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /미끼 0.*보유/ })).toBeNull()
  fireEvent.change(screen.getByRole('textbox', { name: '미끼 검색' }), {
    target: { value: '미끼 0' },
  })
  expect(screen.getByRole('button', { name: /미끼 0.*보유/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: '다음 미끼 목록' }).hasAttribute('disabled')).toBe(true)
})
it('confirms the chosen snapshot before starting and blocks duplicate requests', async () => {
  let resolve!: (s: PersonalBaitState) => void
  mock.action.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      }),
  )
  mount()
  fireEvent.click(await screen.findByRole('button', { name: '생산 시작 (연료 8)' }))
  expect(mock.action).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '생산 시작' }))
  expect(mock.action).toHaveBeenCalledWith(
    expect.objectContaining({
      p_action: 'start',
      p_bait_id: 'bait',
      p_quantity: 10,
      p_minutes: 30,
      p_expected_fuel: 8,
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: '처리 중…' }))
  expect(mock.action).toHaveBeenCalledTimes(1)
  const s = { ...make(), fuel: 1992, job: job() }
  mock.load.mockResolvedValue(s)
  resolve(s)
  await screen.findByText('정성껏 만들고 있어요')
  expect(
    screen.getByRole('button', { name: '미끼를 만들고 있어요' }).hasAttribute('disabled'),
  ).toBe(true)
})
it('claims ready output with one click and restores the form', async () => {
  mock.load.mockResolvedValue({ ...make(), job: job(true) })
  mock.action.mockImplementation(async () => {
    const s = make()
    mock.load.mockResolvedValue(s)
    return s
  })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: '퐁당 지렁이 10개 수령하기' }))
  await waitFor(() =>
    expect(mock.action).toHaveBeenCalledWith(
      expect.objectContaining({ p_action: 'claim', p_job_id: 'job-test' }),
    ),
  )
  await screen.findByRole('button', { name: '생산 시작 (연료 8)' })
  expect(mock.refresh).toHaveBeenCalled()
})
it('keeps uncertain requests across a remount and retries the same operation id', async () => {
  mock.action.mockRejectedValueOnce(new TypeError('network disconnected'))
  const view = mount()
  fireEvent.click(await screen.findByRole('button', { name: '생산 시작 (연료 8)' }))
  fireEvent.click(screen.getByRole('button', { name: '생산 시작' }))
  await screen.findByRole('button', { name: '이전 요청 다시 확인' })
  const original = mock.action.mock.calls[0][0]
  view.unmount()
  const s = { ...make(), fuel: 1992, job: job() }
  mock.load.mockResolvedValue(s)
  mock.action.mockResolvedValue(s)
  mount()
  fireEvent.click(await screen.findByRole('button', { name: '이전 요청 다시 확인' }))
  await waitFor(() => expect(mock.action).toHaveBeenLastCalledWith(original))
  await waitFor(() =>
    expect(localStorage.getItem('pongdang:personal-bait:workshop-test')).toBeNull(),
  )
  expect(screen.queryByRole('button', { name: '이전 요청 다시 확인' })).toBeNull()
})
it('refreshes a stale quote without silently charging the new amount', async () => {
  mock.action.mockRejectedValue({ code: 'P0001', message: 'FUEL_QUOTE_CHANGED' })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: '생산 시작 (연료 8)' }))
  fireEvent.click(screen.getByRole('button', { name: '생산 시작' }))
  await screen.findByRole('alert')
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  expect(screen.getByRole('alert').textContent).toContain('미끼 가격이 변경됐어요')
  expect(mock.action).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: '이전 요청 다시 확인' })).toBeNull()
})
it('disables production for insufficient fuel without a fuel production link', async () => {
  mock.load.mockResolvedValue({ ...make(), fuel: 0 })
  mount()
  expect(
    (await screen.findByRole('button', { name: '연료가 부족해요' })).hasAttribute('disabled'),
  ).toBe(true)
  expect(screen.queryByRole('link', { name: '연료 생산소에서 준비하기' })).toBeNull()
})
