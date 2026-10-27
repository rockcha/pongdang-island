import { MemoryRouter } from 'react-router'
import {appQueryClient} from '@/lib/account-cache'
import type { ReactNode } from 'react'
import {
  cleanup,
  fireEvent,
  render as renderBase,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HallPage } from '@/features/hall-of-fame/hall-page'
function render(ui: ReactNode) {
  return renderBase(<MemoryRouter>{ui}</MemoryRouter>)
}
const api = vi.hoisted(() => ({ feed: vi.fn(), wall: vi.fn(), action: vi.fn(), counts: vi.fn() }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'me' } } }),
}))
vi.mock('@/features/hall-of-fame/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/hall-of-fame/api')>()),
  loadHall: api.feed,
  readHall: api.feed,
  loadSectionWall: api.wall,
  actOnSection: api.action,
  loadSectionCounts: api.counts,
}))
const player = { id: 'friend', nickname: '바다퐁', avatar_path: null, value: 1200, rank: 1 }
const wall = { total: 0, comments: [] }
beforeEach(() => {
  vi.clearAllMocks()
  appQueryClient.clear()
  api.feed.mockResolvedValue({ rankings: { casts: [player] }, generatedAt: '2026-10-21T10:00:00Z' })
  api.wall.mockResolvedValue(wall)
  api.action.mockResolvedValue(wall)
  api.counts.mockResolvedValue({ casts: 0 })
})
afterEach(cleanup)
it('pins an exact rank outside TOP 5 and highlights the caller among two neighbors on each side',async()=>{
 const neighbors=Array.from({length:5},(_,i)=>({...player,id:i===2?'me':`near-${i}`,nickname:i===2?'내퐁이':`이웃${i}`,rank:126+i,value:12452-i}))
 api.feed.mockResolvedValue({rankings:{casts:[player]},personal:{casts:{rank:128,value:12450,neighbors},fish:{rank:null,value:42,neighbors:[]}},generatedAt:new Date().toISOString()})
 render(<HallPage/>)
 const card=screen.getByRole('region',{name:'내 순위'})
 expect(await within(card).findByText('내 순위 128위 · 내 기록 12,450회')).toBeTruthy()
 expect(screen.getByLabelText('기록 목록').contains(card)).toBe(false)
 fireEvent.click(within(card).getByRole('button',{name:'내 주변 보기'}))
 const dialog=screen.getByRole('dialog')
 expect(within(dialog).getAllByRole('listitem')).toHaveLength(5)
 expect(dialog.querySelector('[aria-current="true"]')?.textContent).toContain('내퐁이 · 나')
 fireEvent.keyDown(dialog,{key:'Escape'})
 fireEvent.change(screen.getByRole('combobox',{name:'내 순위 종목'}),{target:{value:'fish'}})
 expect(screen.getByText('집계 범위 밖 · 내 기록 42마리')).toBeTruthy()
 expect(screen.getByRole('button',{name:'내 주변 보기'}).hasAttribute('disabled')).toBe(true)
 fireEvent.click(screen.getByRole('tab',{name:'별별 기록'}))
 expect(screen.getByText('아직 기록이 없어요')).toBeTruthy()
})
it('orders both tabs and opens section discussions', async () => {
  render(<HallPage />)
  await screen.findByLabelText('1위 바다퐁, 1,200회')
  expect(screen.getByRole('link', { name: '1위 바다퐁, 1,200회' }).getAttribute('href')).toBe('/friends/friend/aquarium')
  expect(
    screen
      .getAllByRole('heading', { level: 3 })
      .slice(0, 5)
      .map((h) => h.textContent),
  ).toEqual(['낚싯대 과로 유발자', '물고기 출석부 반장', '걸어 다니는 바다사전', '신화도 이 집 단골', '용왕님 비밀 단골'])
  expect(screen.getAllByText('집계 기준')).toHaveLength(14)
  expect(screen.getByText('성공·실패를 합산한 직접 낚시 완료 횟수')).toBeTruthy()
  expect(document.querySelectorAll('[style*="honor-records.png"]')).toHaveLength(16)
  expect(screen.getByRole('heading',{name:'지갑은 얇고 창고는 빵빵'})).toBeTruthy()
  expect(screen.getByRole('heading',{name:'바다 장사의 신'})).toBeTruthy()
  expect(screen.queryByRole('button', { name: /1위 바다퐁/ })).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: '별별 기록' }))
  expect(
    screen
      .getAllByRole('heading', { level: 3 })
      .slice(0, 4)
      .map((h) => h.textContent),
  ).toEqual(['바다 전세 낸 퐁이', '손이 미끄러웠을 뿐', '어항 인테리어 장인', '바닷가 청소부'])
  expect(screen.getAllByText('집계 기준')).toHaveLength(15)
  for(const label of ['사다리의 왕','홀짝의 왕','벽돌깨기의 왕','그림자 맞히기의 왕','기억력 게임의 왕'])expect(screen.getByRole('heading',{name:label})).toBeTruthy()
  expect(screen.getByText('직접 낚시로 건져 올린 쓰레기의 누적 개수')).toBeTruthy()
  expect(document.querySelectorAll('[style*="fun-records.png"]')).toHaveLength(10)
  expect(screen.queryByText('최다 연속 성공')).toBeNull()
  expect(screen.queryByText('최장 연속 낚시 일수')).toBeNull()
  expect(screen.queryByRole('button',{name:/이야기/})).toBeNull()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(api.wall).not.toHaveBeenCalled()
  expect(api.counts).not.toHaveBeenCalled()
  expect(api.action).not.toHaveBeenCalled()
})
it('recovers ranking requests without loading discussion data',async()=>{
 api.feed.mockRejectedValueOnce(new Error('offline'))
 render(<HallPage/>)
 await screen.findByRole('alert')
 fireEvent.click(screen.getByRole('button',{name:'다시 불러오기'}))
 expect(await screen.findByLabelText('1위 바다퐁, 1,200회')).toBeTruthy()
 expect(api.counts).not.toHaveBeenCalled()
})
