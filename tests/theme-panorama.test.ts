import { afterEach, expect, it, vi } from 'vitest'
import { themePanoramaUrl } from '@/features/aquarium/theme-panorama'
import panoramas from '@/features/aquarium/theme-panoramas.json'
import catalog from '../supabase/catalog/catalog.json'
vi.mock('@/features/aquarium/api', () => ({ backgroundUrl: (path: string) => `https://art.example/${path}` }))

afterEach(() => vi.unstubAllEnvs())

it('provides a distinct local panorama for every catalog theme without changing catalog paths', () => {
  vi.stubEnv('DEV', true)
  expect(Object.keys(panoramas).sort()).toEqual(catalog.aquarium_backgrounds.map(theme => theme.image_path).sort())
  expect(new Set(Object.values(panoramas)).size).toBe(catalog.aquarium_backgrounds.length)
  for (const theme of catalog.aquarium_backgrounds) {
    expect(themePanoramaUrl(theme.image_path)).toMatch(/^\/assets\/storage-upload\/new\/.*-panorama-v[1-9]\d*\.png$/)
  }
})

it('uses uploaded panoramas in production and preserves unregistered theme rendering', () => {
  expect(themePanoramaUrl(undefined)).toBeUndefined()
  expect(themePanoramaUrl('custom.png')).toBeUndefined()
  vi.stubEnv('DEV', false)
  for (const theme of catalog.aquarium_backgrounds) expect(themePanoramaUrl(theme.image_path)).toMatch(/^https:\/\/art\.example\/.*-panorama-v[1-9]\d*\.png$/)
})

it.each(['sunlit-tropical-aquascape-v1.png','black-sail-cove-v1.png','fairy-dew-grove-panorama-v1.png','fairy-petal-palace-panorama-v1.png','fairy-moonlit-lake-panorama-v1.png','halloween-pumpkin-teahouse-panorama-v1.png','halloween-ghost-glasshouse-panorama-v1.png','halloween-witch-lavender-room-panorama-v1.png'] as const)('resolves %s from its own generation batch and the same uploaded panorama', (path) => {
  vi.stubEnv('DEV',true)
  expect(themePanoramaUrl(path)).toBe('/'+panoramas[path].localPath)
  vi.stubEnv('DEV',false)
  expect(themePanoramaUrl(path)).toBe('https://art.example/'+panoramas[path].file)
})
