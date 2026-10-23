// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { BaitProductionPage } from '../src/features/production/bait-production-page'
const mock = vi.hoisted(() => ({ load: vi.fn(), act: vi.fn() }))
vi.mock('../src/features/production/bait-production-api', async (original) => ({
  ...(await original<object>()),
  loadBaitProduction: mock.load,
  actBaitProduction: mock.act,
}))
vi.mock('../src/components/landscape-image', () => ({
  LandscapeImage: ({ alt }: { alt: string }) => <span>{alt}</span>,
}))
const site = {
  id: 'wriggly-soil-box',
  name: '꼬물꼬물 흙상자',
  description: '연료로 미끼를 만들어요.',
  bait_id: 'bait',
  baitName: '지렁이',
  image_path: '/bait.png',
  price: 300,
  fuel_cost: 2,
  output_count: 2,
  production_minutes: 60,
  storage_minutes: 40,
  ownedCount: 5,
  startedAt: null,
  completesAt: null,
  expiresAt: null,
  runOutput: null,
}
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
it('confirms a half-price sale and retries an uncertain response using the same operation id',async()=>{
 const state={serverNow:new Date().toISOString(),gold:10000,fuel:20,facilities:[site],sites:[{...site,siteId:'owned'}]}
 mock.load.mockResolvedValue(state)
 mock.act.mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce({...state,gold:10150,sites:[]})
 render(<MemoryRouter><BaitProductionPage/></MemoryRouter>)
 fireEvent.click(await screen.findByRole('button',{name:/꼬물꼬물 흙상자/}))
 fireEvent.click(screen.getByRole('button',{name:'판매 150골드'}))
 expect(mock.act).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'판매 확정'}))
 await screen.findByRole('alert')
 const operation=mock.act.mock.calls[0][0]
 expect(operation).toMatchObject({p_action:'sell',p_facility:'owned',p_quantity:1})
 fireEvent.click(screen.getByRole('button',{name:'판매 확정'}))
 await waitFor(()=>expect(mock.act).toHaveBeenCalledTimes(2))
 expect(mock.act.mock.calls[1][0]).toEqual(operation)
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
})
it('offers the same shop sort select as fuel production and keeps bait search working',async()=>{
 mock.load.mockResolvedValue({serverNow:new Date().toISOString(),gold:10000,fuel:20,facilities:[site,{...site,id:'second',name:'별빛 공방',baitName:'진주새우',output_count:10,price:900}],sites:[]})
 render(<MemoryRouter><BaitProductionPage shop/></MemoryRouter>)
 await screen.findByRole('button',{name:/꼬물꼬물 흙상자/})
 fireEvent.click(screen.getByRole('combobox',{name:'생산소 정렬'}))
 fireEvent.keyDown(await screen.findByRole('option',{name:'생산량 많은 순'}),{key:'Enter'})
 await waitFor(()=>expect(screen.getAllByRole('button',{name:/꼬물꼬물 흙상자|별빛 공방/})[0].textContent).toContain('별빛 공방'))
 fireEvent.change(screen.getByRole('searchbox',{name:'미끼 생산소 검색'}),{target:{value:'진주새우'}})
 expect(screen.queryByRole('button',{name:/꼬물꼬물 흙상자/})).toBeNull()
 expect(screen.getByRole('button',{name:/별빛 공방/})).toBeTruthy()
})
it('shows repeat ownership without a four-site purchase cap and submits the selected quantity', async () => {
  const state = {
    serverNow: new Date().toISOString(),
    gold: 10000,
    fuel: 20,
    facilities: [site],
    sites: Array.from({ length: 5 }, (_, i) => ({ ...site, siteId: String(i) })),
  }
  mock.load.mockResolvedValue(state)
  mock.act.mockResolvedValue(state)
  render(
    <MemoryRouter>
      <BaitProductionPage shop />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: /꼬물꼬물 흙상자/ }))
  fireEvent.change(screen.getByRole('spinbutton', { name: '구매 수량' }), {
    target: { value: '3' },
  })
  fireEvent.click(screen.getByRole('button', { name: '900골드로 구매' }))
  await waitFor(() =>
    expect(mock.act).toHaveBeenCalledWith(
      expect.objectContaining({ p_action: 'buy', p_quantity: 3, p_facility: site.id }),
    ),
  )
})
it('disables another start when four sites are working', async () => {
  const now = Date.now(),
    state = {
      serverNow: new Date(now).toISOString(),
      gold: 10000,
      fuel: 20,
      facilities: [site],
      sites: [
        ...Array.from({ length: 4 }, (_, i) => ({
          ...site,
          siteId: String(i),
          startedAt: new Date(now - 1000).toISOString(),
          completesAt: new Date(now + 60000).toISOString(),
          expiresAt: new Date(now + 120000).toISOString(),
        })),
        { ...site, siteId: 'idle' },
      ],
    }
  mock.load.mockResolvedValue(state)
  render(
    <MemoryRouter>
      <BaitProductionPage />
    </MemoryRouter>,
  )
  await screen.findAllByRole('button', { name: /꼬물꼬물 흙상자/ })
  fireEvent.click(screen.getByRole('button', { name: '대기 중' }))
  fireEvent.click(screen.getByRole('button', { name: /꼬물꼬물 흙상자/ }))
  expect(
    (screen.getByRole('button', { name: '미끼 생산소가 4곳 가동 중이에요' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  expect(mock.act).not.toHaveBeenCalled()
})
