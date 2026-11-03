import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {InhabitantMotion} from '@/features/aquarium/inhabitant-motion'
import {movementSettings,shouldFlipSpecies} from '@/features/aquarium/movement-settings'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
import type {OwnedCollectible,Species} from '@/features/collection/api'
const manifest=JSON.parse(readFileSync('assets/storage-upload/new/20261103-151800/manifest.json','utf8'))
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
const species=manifest.items.map((item:{id:string})=>catalog.collectible_species.find((s:Species)=>s.id===item.id)) as Species[]
const owned=(s:Species):OwnedCollectible=>({id:s.id,species_id:s.id,tank_id:null,animation_seed:413758,position_x:null,position_y:null,acquired_at:'2026-11-03T00:00:00Z',species:s})
it('keeps plush toys still on the bottom even before manual placement',()=>{
 for(const s of species.filter(s=>s.kind==='trash')){
  const motion=new InhabitantMotion(owned(s))
  const before={...motion.update(0,.016,800,400)},after={...motion.update(60,.016,800,400)}
  expect(movementSettings(s).type).toBe('fixed')
  expect(after.x).toBe(before.x);expect(after.y).toBe(before.y)
  expect(after.y).toBeGreaterThan(280)
  expect(after.frame).toBe(0)
  expect(shouldFlipSpecies(s,-1)).toBe(false)
 }
})
it('swims fish within their declared depth bands and flips right-facing artwork for left travel',()=>{
 for(const s of species.filter(s=>s.kind==='fish')){
  const motion=new InhabitantMotion(owned(s)),poses=Array.from({length:40},(_,t)=>({...motion.update(t,.016,800,400)}))
  expect(Math.max(...poses.map(p=>p.x))-Math.min(...poses.map(p=>p.x))).toBeGreaterThan(20)
  for(const pose of poses){expect(pose.y).toBeGreaterThanOrEqual(Number(s.swim_y_min)*(400-pose.size)-1);expect(pose.y).toBeLessThanOrEqual(Number(s.swim_y_max)*(400-pose.size)+1)}
  expect(shouldFlipSpecies(s,1)).toBe(false);expect(shouldFlipSpecies(s,-1)).toBe(true)
  expect(new Set(poses.map(p=>p.frame)).size).toBeGreaterThan(1)
  for(let frame=0;frame<4;frame++)expect(swimFrameLayout(s.sprite_sheet_path!,frame)).toEqual({originX:.5,originY:.5,scale:1})
 }
})
