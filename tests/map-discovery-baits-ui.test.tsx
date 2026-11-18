import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import catalog from '../supabase/catalog/catalog.json'
import { BaitEffectDetails } from '@/features/fishing/bait-effect-details'
import { fishingDisplayBait } from '@/features/fishing/bait-info'
import { FishingOdds } from '@/features/fishing/fishing-odds'
import type { FishingBait, PreparedFishing } from '@/features/fishing/api'

afterEach(cleanup)
const compass = {
  ...catalog.fishing_baits.find((b) => b.id === 'bait_map_compass_jelly')!,
  mechanicsVersion: 2,
  baseMapChanceBp: 1300,
  mapChanceBp: 1800,
} as FishingBait
it('separates map odds and equipped bonus from the three grade percentages', () => {
  render(<BaitEffectDetails bait={compass} compact minimal />)
  const map = within(screen.getByLabelText('지도 조각 추첨 확률'))
  expect(map.getByText('18%')).toBeTruthy()
  expect(map.queryByText(/기본|유물/)).toBeNull()
  for (const percent of ['67%', '30%', '3%']) expect(screen.getByText(percent)).toBeTruthy()
  expect(screen.queryByText('신화')).toBeNull()
  expect(map.queryByText(/같은 등급에 남은 지도 조각이 없으면/)).toBeNull()
})
it('shows the base chance without inventing an equipped bonus', () => {
  render(<BaitEffectDetails bait={{ ...compass, mapChanceBp: 1300 }} />)
  expect(screen.getByText('13%')).toBeTruthy()
  expect(screen.queryByText(/지도 확률 유물과 함께 적용돼요/)).toBeNull()
  expect(screen.queryByText(/유물 \+/)).toBeNull()
})
it('shows the premium pearl map chance separately from its epic grade ratio', () => {
  const pearl = {
    ...catalog.fishing_baits.find((b) => b.id === 'bait_map_star_chart_pearl')!,
    mechanicsVersion: 2,
    baseMapChanceBp: 2500,
    mapChanceBp: 2500,
  } as FishingBait
  render(<BaitEffectDetails bait={pearl} compact minimal />)
  expect(within(screen.getByLabelText('지도 조각 추첨 확률')).getByText('25%')).toBeTruthy()
  for (const percent of ['15%', '50%', '35%']) expect(screen.getByText(percent)).toBeTruthy()
  expect(screen.queryByText('신화')).toBeNull()
})
it('uses reserved map odds during an ongoing cast after equipment changes', () => {
  const prepared = {
    bait_id: compass.id,
    bait_profile: {
      common_bp: 6700,
      rare_bp: 3000,
      epic_bp: 300,
      mythic_bp: 0,
      effect_kind: 'standard',
      target_kinds: ['fish', 'trash', 'decoration'],
      map_chance_bp: 800,
      effective_map_chance_bp: 800,
    },
  } as PreparedFishing
  const displayed = fishingDisplayBait(compass, prepared)
  expect(displayed.baseMapChanceBp).toBe(800)
  expect(displayed.mapChanceBp).toBe(800)
  expect(fishingDisplayBait(compass, null).mapChanceBp).toBe(1800)
})
it('keeps ordinary and pet bait details free of map-specialist odds', () => {
  const bait = catalog.fishing_baits.find((b) => b.id === 'bait')! as FishingBait
  render(<BaitEffectDetails bait={{ ...bait, mechanicsVersion: 2 }} />)
  expect(screen.queryByLabelText('지도 조각 추첨 확률')).toBeNull()
})

it('shows the equipped map chance in the fishing tips dialog', () => {
  render(<FishingOdds bait={compass} />)
  fireEvent.click(screen.getByRole('button', { name: '낚시 잘하는 꿀팁' }))
  expect(within(screen.getByLabelText('지도 조각 추첨 확률')).getByText('18%')).toBeTruthy()
})
