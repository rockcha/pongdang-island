import fs from 'node:fs'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { petDrawLayout } from '@/features/pets/pet-draw-layout'
import { petSpecies } from '@/features/pets/pet-catalog'
const landmarks=JSON.parse(fs.readFileSync('assets/storage-upload/new/20261110-160000/motion-landmarks.json','utf8')).pets
it('keeps face scale, horizontal center and floor close across idle and reactions', () => {
  const review=JSON.parse(fs.readFileSync('assets/storage-upload/new/20261110-160000/motion-registration-review.json','utf8'))
  for(const pet of petSpecies){
    const ref=review[pet.id].idle
    const referenceDraw=petDrawLayout(pet.id,'idle')
    const referenceEyes=landmarks[pet.id].idle.map(([x,y]:number[])=>[referenceDraw.x+x*ref.cell/400*referenceDraw.scale,referenceDraw.y+y*ref.cell/400*referenceDraw.scale])
    const referenceSeparation=Math.hypot(referenceEyes[1][0]-referenceEyes[0][0],referenceEyes[1][1]-referenceEyes[0][1])
    for(const kind of ['idle','eat','happy','needs'] as const){
      const pose=review[pet.id][kind],draw=petDrawLayout(pet.id,kind)
      const eyes=landmarks[pet.id][kind].map(([x,y]:number[])=>[draw.x+x*pose.cell/400*draw.scale,draw.y+y*pose.cell/400*draw.scale])
      const separation=Math.hypot(eyes[1][0]-eyes[0][0],eyes[1][1]-eyes[0][1])
      expect(separation).toBeCloseTo(referenceSeparation,5)
      expect(Math.abs(pose.eyeCenter[0]-ref.eyeCenter[0])).toBeLessThan(.01)
      expect(Math.abs(pose.eyeResidual)).toBeLessThan(15)
      expect(Math.abs(pose.floorResidual)).toBeLessThan(15)
    }
  }
})
it('keeps complete silhouettes inside the stage for every pet, pose and frame', async () => {
  for (const pet of petSpecies)
    for (const [kind, suffix, columns] of [
      ['idle', 'idle8_v2', 4],
      ['hungry', 'hungry4_v1', 2],
      ['happy', 'happy8_v1', 4],
      ['eat', 'eat8_v1', 4],
      ['needs', 'needs8_v1', 4],
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
