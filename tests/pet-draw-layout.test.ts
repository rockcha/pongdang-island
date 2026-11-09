import fs from 'node:fs'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { petDrawLayout } from '@/features/pets/pet-draw-layout'
import { petSpecies } from '@/features/pets/pet-catalog'
it('keeps complete silhouettes inside the stage for every pet, pose and frame', async () => {
  for (const pet of petSpecies)
    for (const [kind, suffix, columns] of [
      ['idle', 'idle8_v2', 4],
      ['hungry', 'hungry4_v1', 2],
      ['happy', 'happy8_v1', 4],
      ['eat', 'eat8_v1', 4],
    ] as const) {
      const { data, info } = await sharp(
        fs.readFileSync(`public/pets/${pet.id}_${suffix}_sprite.png`),
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const draw = petDrawLayout(pet.id, kind)
      expect(info.width).toBe(draw.cell * columns)
      let left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++)
          if (data[(y * info.width + x) * 4 + 3] >= 32) {
            const dx = draw.x + (x % draw.cell) * draw.scale,
              dy = draw.y + (y % draw.cell) * draw.scale
            left = Math.min(left, dx)
            right = Math.max(right, dx)
            top = Math.min(top, dy)
            bottom = Math.max(bottom, dy)
          }
      expect(left, `${pet.id}/${kind} left`).toBeGreaterThanOrEqual(31)
      expect(right, `${pet.id}/${kind} right`).toBeLessThanOrEqual(609)
      expect(top, `${pet.id}/${kind} top`).toBeGreaterThanOrEqual(27)
      expect(bottom, `${pet.id}/${kind} bottom`).toBeLessThanOrEqual(561)
    }
})
