import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it } from 'vitest'
import { FishingRecordsView } from '@/features/fishing-records/fishing-records-page'
import type { TodayFishingRecords } from '@/features/fishing-records/api'
afterEach(cleanup)
const data: TodayFishingRecords = {
  serverNow: '2026-10-28T19:00:00Z',
  day: '2026-10-29',
  nextResetAt: '2026-10-29T15:00:00Z',
  totalCasts: 150,
  caughtCount: 140,
  failedCount: 9,
  unfinishedCount: 1,
  rarities: { mythic: 2, epic: 8, rare: 30, common: 100 },
  baits: [
    { id: 'bait', name: '퐁당 지렁이', imagePath: '/items/baits/pongdang-worm.png', used: 100 },
    {
      id: 'bait_shell_crumbs',
      name: '조개 부스러기',
      imagePath: '/items/baits/shell-crumbs.png',
      used: 50,
    },
  ],
}
it('shows actual totals, all four rarities and bait usage instead of remaining inventory', () => {
  render(
    <MemoryRouter>
      <FishingRecordsView data={data} loading={false} error={false} onRefresh={() => {}} />
    </MemoryRouter>,
  )
  expect(
    within(screen.getByRole('region', { name: '오늘 낚시 횟수' })).getByText('150'),
  ).toBeTruthy()
  const rarities = screen.getByRole('region', { name: '획득 등급별 수량' })
  for (const name of ['신화', '특급', '희귀', '일반'])
    expect(within(rarities).getByText(name)).toBeTruthy()
  expect(
    within(screen.getByRole('region', { name: '사용한 미끼' })).getByText('총 150개'),
  ).toBeTruthy()
  expect(screen.getByText('획득 140 · 실패 9 · 미완료 1')).toBeTruthy()
})
it('handles an empty day and failed loading without displaying invented counts', () => {
  const view = render(
    <MemoryRouter>
      <FishingRecordsView loading={false} error={true} onRefresh={() => {}} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByText('오늘 낚시 횟수')).toBeNull()
  view.rerender(
    <MemoryRouter>
      <FishingRecordsView
        data={{
          ...data,
          totalCasts: 0,
          caughtCount: 0,
          failedCount: 0,
          unfinishedCount: 0,
          rarities: { mythic: 0, epic: 0, rare: 0, common: 0 },
          baits: [],
        }}
        loading={false}
        error={false}
        onRefresh={() => {}}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: '낚시하러 가기' }).getAttribute('href')).toBe('/fishing')
})
