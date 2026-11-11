import fs from 'node:fs'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { petSpecies, petUsesAtlas } from '@/features/pets/pet-catalog'
import layouts from '@/features/pets/pet-sprite-layouts.json'
import calmLayouts from '@/features/pets/pet-calm-idle-layouts.json'
import eatingLayouts from '@/features/pets/pet-eating-layouts.json'
import blinkLayouts from '@/features/pets/pet-needs-blink-layouts.json'
const base = 'assets/storage-upload/new/20261109-181500'
const manifest = JSON.parse(fs.readFileSync(`${base}/manifest.json`, 'utf8'))
it('ships four blink companions with bounded opaque eye patches and verified alpha', async()=>{
  const base='assets/storage-upload/new/20261110-160000'
  const m=JSON.parse(fs.readFileSync(`${base}/manifest.json`,'utf8'))
  expect(m.items).toHaveLength(4)
  for(const pet of petSpecies.filter(p=>!petUsesAtlas(p.id))){
    const layout=blinkLayouts[`${pet.id}-needs-blink` as keyof typeof blinkLayouts]
    const entry=m.items.find((e:{pet_id:string})=>e.pet_id===pet.id)
    const bytes=fs.readFileSync(`public/${entry.sprite_sheet_path}`),meta=await sharp(bytes).metadata()
    expect(meta.hasAlpha).toBe(true)
    expect(meta.width).toBe(layout.cell*4)
    expect(meta.height).toBe(layout.cell*2)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sprite_sha256)
    expect(entry.rgbaPreserved).toBe(true)
    expect(layout.eyes).toHaveLength(2)
    for(const [x,y,w,h] of layout.eyes){
      expect(x).toBeGreaterThan(0);expect(y).toBeGreaterThan(0)
      expect(x+w).toBeLessThan(layout.cell);expect(y+h).toBeLessThan(layout.cell)
      const {data}=await sharp(bytes).extract({left:x+2*layout.cell,top:y,width:w,height:h}).raw().toBuffer({resolveWithObject:true})
      expect(Array.from(data).filter((alpha,i)=>i%4===3&&alpha>=128).length).toBeGreaterThan(w*h*.9)
    }
  }
})
it('ships reviewed hungry and lonely poses with preserved alpha and zero anchor drift', async () => {
  const path='assets/storage-upload/new/20261110-154000'
  const m=JSON.parse(fs.readFileSync(`${path}/manifest.json`,'utf8'))
  const anchors=JSON.parse(fs.readFileSync(`${path}/registered-final-8.json`,'utf8').replace(/^\uFEFF/,''))
  expect(m.items).toHaveLength(4)
  for(const entry of m.items){
    const bytes=fs.readFileSync(`public/${entry.sprite_sheet_path}`)
    expect((await sharp(bytes).metadata()).hasAlpha).toBe(true)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sprite_sha256)
    expect(entry.rgbaPreserved).toBe(true)
    const r=anchors.find((r:{storage_path:string})=>r.storage_path===entry.sprite_sheet_path)
    expect(r.frames).toHaveLength(8)
    for(const f of r.frames){expect(f.dx).toBe(0);expect(f.dy).toBe(0);expect(f.rmse).toBeLessThan(40)}
  }
})
it('ships all four dedicated eating sheets with the reviewed alpha and hash', async () => {
  const m = JSON.parse(
    fs.readFileSync('assets/storage-upload/new/20261109-203000/manifest.json', 'utf8'),
  )
  expect(m.items).toHaveLength(4)
  for (const pet of petSpecies.filter(p=>!petUsesAtlas(p.id))) {
    const id = `${pet.id}-eat` as keyof typeof eatingLayouts,
      layout = eatingLayouts[id],
      entry = m.items.find((s: { id: string }) => s.id === id)
    const bytes = fs.readFileSync(`public/${entry.sprite_sheet_path}`),
      meta = await sharp(bytes).metadata()
    expect(meta.hasAlpha).toBe(true)
    expect(meta.width).toBe(layout.cell * 4)
    expect(meta.height).toBe(layout.cell * 2)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sprite_sha256)
    expect(entry.rgbaPreserved).toBe(true)
  }
})
it('ships four pet identities and all twelve alpha sheets with the reviewed layout', async () => {
  expect(manifest.pets.map((p: { id: string }) => p.id)).toEqual(petSpecies.filter(p=>!petUsesAtlas(p.id)).map((p) => p.id))
  expect(manifest.items).toHaveLength(12)
  for (const p of petSpecies.filter(p=>!petUsesAtlas(p.id))) {
    expect(fs.existsSync(`public/pets/${p.id}_v1_thumbnail.png`)).toBe(true)
    for (const [kind, suffix, columns] of [
      ['idle', 'idle8', 4],
      ['hungry', 'hungry4', 2],
      ['happy', 'happy8', 4],
    ] as const) {
      const key = `${p.id}-${kind}` as keyof typeof layouts,
        layout = layouts[key]
      const bytes = fs.readFileSync(`public/pets/${p.id}_${suffix}_v1_sprite.png`)
      const meta = await sharp(bytes).metadata(),
        entry = manifest.items.find((i: { id: string }) => i.id === key)
      expect(meta.hasAlpha).toBe(true)
      expect(meta.width).toBe(layout.cell * columns)
      expect(meta.height).toBe(layout.cell * 2)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sprite_sha256)
      expect(entry.rgbaPreserved).toBe(true)
    }
  }
})
it('ships the calm idle revision with stable silhouettes and baked head alignment', async () => {
  const path = 'assets/storage-upload/new/20261109-190000'
  const calm = JSON.parse(fs.readFileSync(`${path}/manifest.json`, 'utf8'))
  const reg = JSON.parse(fs.readFileSync(`${path}/registration.json`, 'utf8'))
  expect(calm.items).toHaveLength(4)
  for (const p of petSpecies.filter(p=>!petUsesAtlas(p.id))) {
    const id = `${p.id}-idle` as keyof typeof calmLayouts,
      layout = calmLayouts[id]
    const entry = calm.items.find((s: { id: string }) => s.id === id),
      bytes = fs.readFileSync(`public/${entry.sprite_sheet_path}`),
      meta = await sharp(bytes).metadata()
    expect(meta.width).toBe(layout.cell * 4)
    expect(meta.height).toBe(layout.cell * 2)
    expect(meta.hasAlpha).toBe(true)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sprite_sha256)
    const r = reg.find((s: { id: string }) => s.id === id)
    expect(r.rgbaPreserved).toBe(true)
    for (const size of ['width', 'height']) {
      const dimensions = r.bounds.slice(0, 4).map((b: Record<string, number>) => b[size])
      expect(Math.max(...dimensions) - Math.min(...dimensions)).toBeLessThanOrEqual(
        r.sourceCell * 0.02,
      )
    }
  }
})
