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
    expect(themePanoramaUrl(theme.image_path)).toMatch(/^\/assets\/storage-upload\/new\/.*-panorama-v2\.png$/)
  }
})

it('uses uploaded panoramas in production and preserves unregistered theme rendering', () => {
  expect(themePanoramaUrl(undefined)).toBeUndefined()
  expect(themePanoramaUrl('custom.png')).toBeUndefined()
  vi.stubEnv('DEV', false)
  for (const theme of catalog.aquarium_backgrounds) expect(themePanoramaUrl(theme.image_path)).toMatch(/^https:\/\/art\.example\/.*-panorama-v2\.png$/)
})
