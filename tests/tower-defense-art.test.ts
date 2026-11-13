// @vitest-environment node
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { towerFrame } from '../src/features/arcade/tower-defense-assets'
const batch = 'assets/storage-upload/new/20261113-005653'
const manifest = JSON.parse(fs.readFileSync(`${batch}/manifest.json`, 'utf8'))
it('ships matching native SVG originals and transparent atlases with safe frame margins', async () => {
  const sprites = manifest.files.filter((f: any) => f.sprite)
  expect(sprites).toHaveLength(8)
  for (const file of manifest.files) {
    const bytes = fs.readFileSync('public/' + file.path)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256)
    expect(bytes.toString()).toContain('<svg')
    expect(bytes.toString()).not.toMatch(/<image|<script|href=["']https?:\/\//g)
  }
  for (const file of sprites) {
    const bytes = fs.readFileSync('public/' + file.sprite.path)
    const meta = await sharp(bytes).metadata()
    const { data, info } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sprite.sha256)
    expect([meta.width, meta.height, meta.hasAlpha]).toEqual([
      file.columns * 256,
      file.rows * 256,
      true,
    ])
    for (let f = 0; f < file.columns * file.rows; f++) {
      let marginAlpha = 0,
        opaque = 0
      for (let y = 0; y < 256; y++)
        for (let x = 0; x < 256; x++) {
          const a = data[((Math.floor(f / 4) * 256 + y) * info.width + (f % 4) * 256 + x) * 4 + 3]
          if (x < 4 || x >= 252 || y < 4 || y >= 252) marginAlpha = Math.max(marginAlpha, a)
          if (a >= 128) opaque++
        }
      expect(marginAlpha, `${file.id}/${f} safe cell edge`).toBe(0)
      expect(opaque).toBeGreaterThan(1000)
    }
  }
}, 30000)
it('holds a still rest pose and runs a short firing sequence before returning to rest', () => {
  expect([0, -1, 0].map((flash) => towerFrame(flash))).toEqual([0, 0, 0])
  expect([0.4, 0.3, 0.2, 0.1, 0].map((flash) => towerFrame(flash))).toEqual([1, 2, 3, 0, 0])
  expect([0.4, 0.3, 0.2, 0.1, 0].map((flash) => towerFrame(flash, true))).toEqual([0, 0, 0, 0, 0])
})
