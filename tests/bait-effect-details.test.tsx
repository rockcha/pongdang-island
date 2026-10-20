import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {BaitEffectDetails} from '@/features/fishing/bait-effect-details'
import type {FishingBait} from '@/features/fishing/api'
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
afterEach(cleanup)
it('shows separate success and conditional grade odds for every new bait with a real image',()=>{
 for(const bait of catalog.fishing_baits.filter(b=>b.fish_only&&!b.alternating)){
  render(<BaitEffectDetails bait={bait as FishingBait}/>)
  expect(screen.getByText('낚시 성공률').nextElementSibling?.textContent).toBe(`${bait.success_chance_bp/100}%`)
  expect(screen.getByText('성공했을 때의 등급 확률')).toBeTruthy()
  expect(screen.getByText(/물고기 전용/).textContent).toContain('쓰레기·장식물 제외')
  expect(existsSync('public'+bait.image_path)).toBe(true)
  cleanup()
 }
})
it('shows the server-provided next jelly phase and failure progression',()=>{
 const bait=catalog.fishing_baits.find(b=>b.alternating)
 render(<BaitEffectDetails bait={{...bait,nextRarity:'rare'}}/>)
 expect(screen.getByText('희귀 물고기 100%')).toBeTruthy()
 expect(screen.getByText(/실패해도 순서가 진행/)).toBeTruthy()
 expect(screen.queryByText('성공했을 때의 등급 확률')).toBeNull()
})
