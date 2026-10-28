import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { VoyageBetsView } from '@/features/voyage-bets/voyage-bets-view'
import { voyageCountdown, voyagePhase, voyageCompletedRegions } from '@/features/voyage-bets/time'
import type { VoyageState } from '@/features/voyage-bets/api'
import companies from '../supabase/voyage-bets/companies.json'
vi.mock('@/features/collection/collectible-thumbnail', () => ({ CollectibleThumbnail: () => null }))
afterEach(cleanup)
const opensAt = '2026-10-29T23:00:00Z',
  departsAt = '2026-10-30T00:00:00Z',
  resultsAt = '2026-10-30T03:00:00Z'
function fixture(): VoyageState {
  return {
    serverNow: opensAt,
    companies,
    roundLimit: 500,
    firstMultiplier: 3,
    secondMultiplier: 1.2,
    pendingPayout: 0,
    rounds: [
      {
        id: 'round',
        opensAt,
        departsAt,
        resultsAt,
        phase: 'open',
        completedRegions: 0,
        nextRevealAt: '2026-10-30T01:00:00Z',
        refunded: false,
        myStake: 300,
        myBet: { planId: 'plan-0', stake: 300, payout: null, paidAt: null },
        plans: companies.map((c, i) => ({
          id: 'plan-' + i,
          companyId: c.id,
          bait: { id: 'bait_shell_crumbs', name: '조개 부스러기', price: 50 },
          countPerRegion: 30,
          publicRegion: { id: 'coral', name: '산호 해역' },
          targetSales: 7000,
          totalCost: 4600,
          result: null,
          progress: null,
        })),
      },
    ],
  }
}
function view(
  data = fixture(),
  now = Date.parse(opensAt),
  onBet = vi.fn().mockResolvedValue(true),
) {
  return (
    <MemoryRouter>
      <VoyageBetsView data={data} now={now} onBet={onBet} onRefresh={vi.fn()} />
    </MemoryRouter>
  )
}
it('uses exact opening, hourly reveal and announcement boundaries', () => {
  const r = fixture().rounds[0]
  expect(voyagePhase(r, Date.parse(opensAt) - 1)).toBe('scheduled')
  expect(voyagePhase(r, Date.parse(opensAt))).toBe('open')
  expect(voyagePhase(r, Date.parse(departsAt))).toBe('sailing')
  expect(voyageCompletedRegions(r, Date.parse(departsAt) + 3599999)).toBe(0)
  expect(voyageCompletedRegions(r, Date.parse(departsAt) + 3600000)).toBe(1)
  expect(voyageCompletedRegions(r, Date.parse(departsAt) + 7200000)).toBe(2)
  expect(voyagePhase(r, Date.parse(resultsAt))).toBe('settling')
  expect(voyageCountdown(departsAt, Date.parse(departsAt) + 1000)).toBe('00:00:00')
})
it('shows four single-company choices, three-region totals, and two hidden regions', () => {
  render(view())
  expect(screen.getAllByRole('article')).toHaveLength(4)
  expect(screen.getAllByText('총 90회')).toHaveLength(4)
  expect(screen.getAllByText('?')).toHaveLength(8)
  expect(screen.queryByText('목표 초과')).toBeNull()
  expect(screen.queryByText('최종 목표 판매액')).toBeNull()
  expect(screen.getAllByRole('img', { name: '조개 부스러기' })).toHaveLength(4)
  expect(screen.getAllByRole('img', { name: '조개 부스러기' })[0].getAttribute('src')).toBe(
    '/items/baits/shell-crumbs.png',
  )
  expect(screen.getAllByRole('button', { name: '이 회사 선택' })).toHaveLength(3)
})
it('replaces the chosen company, previews 3x and 1.2x, and blocks confirmation at departure', async () => {
  const data = fixture(),
    onBet = vi.fn().mockResolvedValue(true),
    rendered = render(view(data, Date.parse(opensAt), onBet))
  fireEvent.click(within(screen.getAllByRole('article')[1]).getByRole('button'))
  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).queryByText(/기존 회사 선택은 이 회사로 교체/)).toBeNull()
  fireEvent.click(within(dialog).getByRole('button', { name: '500' }))
  expect(within(dialog).getByLabelText('1,500골드')).toBeTruthy()
  expect(within(dialog).getByLabelText('600골드')).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: '선택 확정하기' }))
  await waitFor(() => expect(onBet).toHaveBeenCalledWith(data.rounds[0].plans[1], 500))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  fireEvent.click(within(screen.getAllByRole('article')[0]).getByRole('button'))
  const again = await screen.findByRole('alertdialog')
  rendered.rerender(view(data, Date.parse(departsAt), onBet))
  expect(
    within(again).getByRole('button', { name: '선택 확정하기' }).hasAttribute('disabled'),
  ).toBe(true)
})
it('refunds cancellation and does not require picking another company', async () => {
  const data = fixture(),
    onBet = vi.fn().mockResolvedValue(true)
  render(view(data, Date.parse(opensAt), onBet))
  fireEvent.click(screen.getByRole('button', { name: '내 선택 수정' }))
  const dialog = await screen.findByRole('alertdialog')
  fireEvent.click(within(dialog).getByRole('button', { name: '기존 참여 취소' }))
  fireEvent.click(within(dialog).getByRole('button', { name: '취소하고 반환받기' }))
  await waitFor(() => expect(onBet).toHaveBeenCalledWith(data.rounds[0].plans[0], 0))
})
it('keeps scheduled plans sealed and moves participation instructions into the help dialog', async () => {
  const data = fixture()
  data.rounds[0].myBet = null
  data.rounds[0].myStake = 0
  const v = render(view(data, Date.parse(opensAt) - 1))
  expect(screen.queryByText('조개 부스러기')).toBeNull()
  expect(screen.queryByText('?')).toBeNull()
  expect(v.container.querySelectorAll('.voyage-countdown')).toHaveLength(1)
  expect(v.container.querySelectorAll('.voyage-card-footer')).toHaveLength(0)
  const status = screen.getByRole('region', { name: '항차 진행 상태' })
  expect(within(status).getByText('09:00 출항')).toBeTruthy()
  expect(within(status).getByText('접수 시작까지')).toBeTruthy()
  expect(status.textContent).not.toMatch(/접수 대기|10월|30일|한국 시간|최종 발표/)
  expect(screen.queryByText('이번 항차의 성과 순위를 맞혀보세요.')).toBeNull()
  expect(screen.queryByText('참여 방법')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '만선 승부장 이용 안내' }))
  const help = await screen.findByRole('dialog', { name: '만선 승부장 이용 안내' })
  expect(within(help).getByText('참여 방법')).toBeTruthy()
  expect(within(help).getByText('3배')).toBeTruthy()
  expect(within(help).getByText('1.2배')).toBeTruthy()
  expect(within(help).getByText('12:00')).toBeTruthy()
  expect(within(help).getByText('23:00')).toBeTruthy()
})
it('shows a provisional leaderboard and exposes only completed region detail', async () => {
  const data = fixture(),
    r = data.rounds[0]
  r.phase = 'sailing'
  r.completedRegions = 1
  r.nextRevealAt = '2026-10-30T02:00:00Z'
  for (let i = 0; i < 4; i++)
    r.plans[i].progress = {
      sales: 2800 - i * 100,
      target: 2500,
      achievement: 112 - i * 4,
      rank: i + 1,
      tied: false,
      regions: [{ regionId: 'coral', regionName: '산호 해역', sales: 2800 - i * 100, catches: [] }],
    }
  render(view(data, Date.parse(departsAt) + 3600000))
  expect(screen.getByRole('list', { name: '현재 회사 순위' })).toBeTruthy()
  expect(screen.queryByRole('article')).toBeNull()
  expect(screen.getByLabelText('달성률 112%')).toBeTruthy()
  expect(
    within(screen.getByRole('button', { name: '통통해운 어획 상세' })).getByText(
      '내 선택 · 300골드 참여',
    ),
  ).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '통통해운 어획 상세' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getAllByText('?')).toHaveLength(2)
  expect(within(dialog).queryByText('전체 어획 보기')).toBeNull()
})
it('shows final payout, profit and a themed history selector', async () => {
  const data = fixture(),
    r = data.rounds[0]
  r.phase = 'settled'
  r.completedRegions = 3
  r.myBet!.payout = 900
  r.myBet!.paidAt = resultsAt
  for (let i = 0; i < 4; i++) {
    const regions = [0, 1, 2].map((n) => ({
      regionId: String(n),
      regionName: '완료 해역 ' + n,
      sales: 1000,
      catches: [],
    }))
    r.plans[i].result = { sales: 3000, profit: 100, rank: i + 1, tied: false, regions }
    r.plans[i].progress = { ...r.plans[i].result!, target: 2800, achievement: 107.14 }
  }
  render(view(data, Date.parse(resultsAt)))
  fireEvent.click(screen.getByRole('button', { name: '지난 결과' }))
  expect(screen.getByRole('combobox', { name: '지난 항차 선택' })).toBeTruthy()
  expect(screen.getByRole('list', { name: '최종 회사 순위' })).toBeTruthy()
  expect(
    within(screen.getByRole('button', { name: '통통해운 어획 상세' })).getByText(
      /지급 900골드 · 순손익 \+600골드/,
    ),
  ).toBeTruthy()
})
it('shows a stored settlement reward and links to its claim dialog until received', () => {
  const data = fixture(),
    r = data.rounds[0]
  r.phase = 'settled'
  r.completedRegions = 3
  r.myBet = {
    ...r.myBet!,
    payout: 900,
    paidAt: resultsAt,
    rewardGiftId: 'reward-1',
    rewardClaimedAt: null,
  }
  r.plans[0].result = { sales: 3000, profit: 100, rank: 1, tied: false, regions: [] }
  const rendered = render(view(data, Date.parse(resultsAt)))
  const result = screen.getByRole('region', { name: '내 정산 결과' })
  expect(within(result).getByText('통통해운 · 최종 1등')).toBeTruthy()
  expect(within(result).getByText('보관함에 도착한 보상')).toBeTruthy()
  expect(within(result).getByText('900')).toBeTruthy()
  expect(within(result).getByRole('link', { name: '보관함에서 받기' }).getAttribute('href')).toBe(
    '/notifications?gift=reward-1',
  )
  r.myBet.rewardClaimedAt = resultsAt
  rendered.rerender(view(data, Date.parse(resultsAt)))
  expect(within(result).getByText('수령 완료')).toBeTruthy()
  expect(within(result).queryByRole('link')).toBeNull()
})
