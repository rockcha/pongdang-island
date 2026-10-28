// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import catalog from '../supabase/catalog/catalog.json'
import manifest from '../assets/optimized-background-previews/manifest.json'
import {backgroundPreviewArt} from '../src/features/aquarium/background-preview-art'

it('ships small previews for every background without cropping or replacing source art',async()=>{
 expect(manifest.items.map(item=>item.key).sort()).toEqual([...new Set(catalog.aquarium_backgrounds.map(item=>item.image_path))].sort())
 for(const item of manifest.items){
  const preview=backgroundPreviewArt(item.key)!
  expect(preview.url).toMatch(/^\/game-art\/background-previews\/[a-f0-9]{24}-960\.webp$/)
  expect(statSync('public'+preview.url).size).toBe(item.preview.bytes)
  const metadata=await sharp('public'+preview.url).metadata()
  expect(metadata.width).toBe(preview.width)
  expect(metadata.height).toBe(preview.height)
  expect(Math.max(preview.width,preview.height)).toBeLessThanOrEqual(960)
  expect(Math.abs(preview.height-preview.width*item.sourceHeight/item.sourceWidth)).toBeLessThanOrEqual(1)
  expect(createHash('sha256').update(readFileSync(item.source)).digest('hex')).toBe(item.sourceHash)
 }
 expect(manifest.summary.previewBytes).toBeLessThan(manifest.summary.sourceBytes*.15)
})

it('does not redirect unknown or private background URLs',()=>{
 for(const path of ['unknown.png','https://example.test/private.png','__proto__'])expect(backgroundPreviewArt(path)).toBeUndefined()
})
