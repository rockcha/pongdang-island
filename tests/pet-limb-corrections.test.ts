// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { petSpecies, petUsesAtlas, type PetSpeciesId } from '@/features/pets/pet-catalog'
import { petSpriteSheetUrl } from '@/features/pets/pet-sprite-sheets'
import manifest from '../assets/storage-upload/new/20261117-184723-pet-limbs/manifest.json'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
function supportRow(data: Buffer, width: number, cell: number, frame: number) {
  let support = -1
  for (let y = 0; y < cell; y++) {
    let count = 0
    for (let x = 0; x < cell; x++)
      if (
        data[((Math.floor(frame / 4) * cell + y) * width + (frame % 4) * cell + x) * 4 + 3] >= 128
      )
        count++
    if (count >= cell * 0.035) support = y
  }
  return support
}

it('routes only the seven repaired sheets to new URLs, leaving all other animations on their existing version', () => {
  expect(manifest.items).toHaveLength(7)
  for (const pet of petSpecies) {
    const atlas = manifest.items.find((p) => p.id === pet.id && p.grid[1] === 4)
    expect(petSpriteSheetUrl(pet.id, 'atlas16')).toBe(
      `/pets/${pet.id}_atlas16_v${atlas ? 2 : 1}_sprite.png`,
    )
    expect(petSpriteSheetUrl(pet.id, 'needs8')).toBe(
      `/pets/${pet.id}_needs8_v${pet.id === 'mochi-dragon' ? 2 : 1}_sprite.png`,
    )
    expect(petSpriteSheetUrl(pet.id, 'idle8')).toBe(`/pets/${pet.id}_idle8_v2_sprite.png`)
    if (!petUsesAtlas(pet.id)) {
      expect(petSpriteSheetUrl(pet.id, 'happy8')).toBe(`/pets/${pet.id}_happy8_v1_sprite.png`)
      expect(petSpriteSheetUrl(pet.id, 'eat8')).toBe(`/pets/${pet.id}_eat8_v1_sprite.png`)
    }
  }
})

it.each(manifest.items)(
  'preserves $id face, ground and all unaffected cells while replacing the reviewed limbs',
  async (item) => {
    const originalBytes = readFileSync(item.source),
      nextBytes = readFileSync(`public/${item.sprite_sheet_path}`)
    expect(sha(originalBytes)).toBe(item.source_sha256)
    expect(sha(nextBytes)).toBe(item.sprite_sha256)
    const old = await sharp(originalBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const next = await sharp(nextBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(next.info).toMatchObject({ width: item.width, height: item.height, channels: 4 })
  expect(await sharp(nextBytes).metadata()).toMatchObject({hasAlpha:true,isPalette:false})
    const cell = item.cell
    for (let frame = 0; frame < item.grid[0] * item.grid[1]; frame++) {
      let changed = 0,
        opaqueHead = 0,
        changedHead = 0,
        changedUntouched = 0,
        outsideMargin = 0
      const repaired = item.repairedFrames.includes(frame)
      for (let y = 0; y < cell; y++)
        for (let x = 0; x < cell; x++) {
          const at = ((Math.floor(frame / 4) * cell + y) * item.width + (frame % 4) * cell + x) * 4
          if (!repaired) {
            if (!next.data.subarray(at, at + 4).equals(old.data.subarray(at, at + 4)))
              changedUntouched++
          } else if (y < item.headPreservationCut && old.data[at + 3] >= 128) {
            opaqueHead++
            if (!next.data.subarray(at, at + 4).equals(old.data.subarray(at, at + 4))) changedHead++
          } else if (!next.data.subarray(at, at + 4).equals(old.data.subarray(at, at + 4)))
            changed++
          if (repaired && next.data[at + 3] >= 128) {
            if (x <= cell * 0.06 || x >= cell * 0.94 || y <= cell * 0.06 || y >= cell * 0.94)
              outsideMargin++
          }
        }
      expect(supportRow(next.data, item.width, cell, frame)).toBe(
        supportRow(old.data, item.width, cell, frame),
      )
      expect(changedHead).toBe(0)
      expect(changedUntouched).toBe(0)
      expect(outsideMargin).toBe(0)
      if (repaired) {
        expect(opaqueHead).toBeGreaterThan(cell * 20)
        expect(changed).toBeGreaterThan(cell * 5)
      }
    }
    const sheet = item.id === 'mochi-dragon' ? 'needs8' : 'atlas16'
    expect(petSpriteSheetUrl(item.id as PetSpeciesId, sheet)).toBe(`/${item.sprite_sheet_path}`)
  },
  30000,
)
