import { expect, it } from 'vitest'
import { placeGroups } from '@/lib/place-groups'
import { ownedFacilities, createDefaultIsland } from '@/features/my-island/owned-facilities'
import { resetIslandDocument } from '@/features/my-island/island-document'
import { islandFixture } from './island-fixture'

it('groups header destinations into seven readable neighborhoods with community buildings together', () => {
  const state = createDefaultIsland(),
    facilities = ownedFacilities()
  expect(placeGroups.map((g) => g.label)).toEqual([
    '내 섬',
    '낚시',
    '생산',
    '장터',
    '수집',
    '소식',
    '광장',
  ])
  expect(state.layout.some((p) => p.label === '교류')).toBe(false)
  for (const group of placeGroups) {
    expect(
      state.layout.some(
        (p) => p.id === 'island-name-sign~zone-' + group.id && p.label === group.label,
      ),
    ).toBe(true)
    const paths = new Set(group.sections.flatMap((s) => s.paths)),
      members = facilities.filter((f) => paths.has(f.to!)),
      positions = members.map((f) => state.layout.find((p) => p.id === f.id)!)
    expect(positions.every(Boolean), group.label).toBe(true)
    expect(
      Math.max(...positions.map((p) => p.x)) - Math.min(...positions.map((p) => p.x)),
      group.label,
    ).toBeLessThanOrEqual(8)
    expect(
      Math.max(...positions.map((p) => p.y)) - Math.min(...positions.map((p) => p.y)),
      group.label,
    ).toBeLessThanOrEqual(12)
  }
  const community = placeGroups.find((g) => g.id === 'community')!.sections.flatMap((s) => s.paths)
  expect(community).toEqual(
    expect.arrayContaining([
      '/friends',
      '/board',
      '/showcase',
      '/hall-of-fame',
      '/development-fund',
      '/square/sponsorship',
      '/square/begging',
    ]),
  )
  const plaza = community.map((path) =>
    state.layout.find((p) => p.id === facilities.find((f) => f.to === path)!.id)!,
  )
  expect(
    Math.max(...plaza.map((p) => p.y)) - Math.min(...plaza.map((p) => p.y)),
  ).toBeLessThanOrEqual(6)
  expect(state.paving.some((p) => p.type === 'stone' && p.y === 24 && p.x < 16)).toBe(false)
  const near = ['/friends', '/board', '/showcase'].map((to) =>
    state.layout.find((p) => p.id === facilities.find((f) => f.to === to)!.id)!,
  )
  expect(Math.max(...near.map((p) => p.x)) - Math.min(...near.map((p) => p.x))).toBeLessThanOrEqual(
    4,
  )
  expect(Math.max(...near.map((p) => p.y)) - Math.min(...near.map((p) => p.y))).toBeLessThanOrEqual(
    4,
  )
  expect(state.paving.filter((p) => p.type === 'grass')).toHaveLength(66)
})
it('maps the recommended template to real owned IDs and paints only materials the account still owns', () => {
  const snapshot = islandFixture(),
    ids = new Map(snapshot.items.map((i) => [i.id, i.type + '~' + crypto.randomUUID()]))
  snapshot.items = snapshot.items.map((i) => ({ ...i, id: ids.get(i.id)! }))
  snapshot.document.layout = snapshot.document.layout.map((p) => ({
    ...p,
    id: ids.get(p.id) ?? p.id,
  }))
  snapshot.stocks['floor-grass'] = 3
  snapshot.stocks['floor-stone'] = 2
  snapshot.stocks['floor-wood'] = 0
  const result = resetIslandDocument(snapshot),
    owned = new Set([
      ...snapshot.items.map((i) => i.id),
      ...snapshot.catalog.filter((c) => c.family === 'facility').map((c) => c.id),
    ])
  expect(result.layout.every((p) => owned.has(p.id))).toBe(true)
  expect(result.layout).toHaveLength(
    snapshot.items.length + snapshot.catalog.filter((c) => c.family === 'facility').length,
  )
  expect(result.paving.filter((p) => p.type === 'grass')).toHaveLength(3)
  expect(result.paving.filter((p) => p.type === 'stone')).toHaveLength(2)
  expect(result.paving.some((p) => p.type === 'wood')).toBe(false)
  expect(
    new Set(result.layout.filter((p) => p.id.startsWith('island-name-sign~')).map((p) => p.label)),
  ).toEqual(new Set(placeGroups.map((g) => g.label)))
  snapshot.stocks['land-piece'] = 774
  expect(() => resetIslandDocument(snapshot)).toThrow('ISLAND_STOCK_REQUIRED')
})
