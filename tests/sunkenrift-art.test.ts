import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { mythicSheetColumns, mythicSwimAsset, mythicSwimFrame, mythicSwimLayout } from '@/features/aquarium/mythic-swim'
import { regionIcons } from '@/features/regions/region-icons'
import { fishingBannerPath } from '@/features/regions/fishing-banner'
import { sunkenriftArt } from '@/features/regions/sunkenrift-art'
import { loveletterArt } from '@/features/regions/loveletter-art'
import sheets from '@/features/aquarium/sunkenrift-mythic-action-layouts.json'

it('ships the overview, map and icon referenced by the released Sunken Rift region', () => {
  for (const name of ['overview-v2', 'map-v2']) {
    const png = readFileSync(`public/regions/sunkenrift/${name}.png`)
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.readUInt32BE(16)).toBeGreaterThan(1000)
    expect(png.readUInt32BE(20)).toBeGreaterThan(900)
  }
  expect(readFileSync('public' + regionIcons.sunkenrift.src, 'utf8')).toContain('<svg')
})

it('ships both Sunken Rift fishing compositions and uses its overview as the banner', () => {
  for (const [src, width, height] of [[sunkenriftArt.fishing.scenery,1536,1024],[sunkenriftArt.fishing.portrait,1024,1536]] as const) {
    const png = readFileSync(`public${src}`)
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width,height])
  }
  expect(fishingBannerPath('sunkenrift')).toBe('/regions/sunkenrift/overview-v2.png')
})

it('ships a portrait panorama for the Love Letter news card', () => {
  const png = readFileSync(`public${loveletterArt.showcase}`)
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1024,1536])
})

it('crops one square pose from each released eight-frame mythic sheet, including versioned aliases', () => {
  for (const sheet of sheets) {
    for (const alias of sheet.aliases) {
      const asset = mythicSwimAsset(`fish/mythic/${alias}_sprite.png`, 'mythic')
      expect(asset, alias).not.toBeNull()
      const png = readFileSync('public' + asset!.url)
      const columns = mythicSheetColumns(asset!.path)
      // Two columns would show two characters in one pose, as in the reported screenshot.
      expect(columns).toBe(4)
      expect(png.readUInt32BE(16) / columns).toBe(png.readUInt32BE(20) / 2)
      const frames = Array.from({ length: 120 }, (_, i) => mythicSwimFrame(asset!.path, i / 20, 0))
      expect(new Set(frames)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]))
      expect(mythicSwimFrame(asset!.path, 5, 0, true)).toBe(0)
      for (let frame = 0; frame < 8; frame++) {
        const layout = mythicSwimLayout(asset!.path, frame)!
        expect(layout.scale).toBeGreaterThan(0)
        expect(Number.isFinite(layout.originX + layout.originY)).toBe(true)
      }
    }
  }
  expect(mythicSwimAsset('fish/mythic/sunkenrift-baron_swim8_v1_sprite.png', 'mythic')!.url).toContain('_v2_')
})
