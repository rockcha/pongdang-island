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
  expect(screen.getByText('잡혔을 때 등급')).toBeTruthy()
  expect(screen.getByText(/물고기 전용/).textContent).toContain('쓰레기·장식물 제외')
  expect(existsSync('public'+bait.image_path)).toBe(true)
  cleanup()
 }
})
it('shows the server-provided next jelly phase and failure progression',()=>{
 const bait=catalog.fishing_baits.find(b=>b.alternating)
 render(<BaitEffectDetails bait={{...bait,nextRarity:'rare'}}/>)
 expect(screen.getByLabelText('희귀 전용 · 다음 차례')).toBeTruthy()
 expect(screen.getByText(/실패해도 다음 차례/)).toBeTruthy()
 expect(screen.queryByText('잡혔을 때 등급')).toBeNull()
 expect(screen.getByText('다음 차례').closest('[aria-label]')?.getAttribute('aria-label')).toContain('희귀')
})
it('keeps fallback-dependent trash and undiscovered pools out of fixed grade percentages',()=>{
 for(const id of ['bait_grubby_magnet','bait_first_greeting','bait_magnet']){
  render(<BaitEffectDetails bait={catalog.fishing_baits.find(b=>b.id===id)}/>)
  expect(screen.queryByText('잡혔을 때 등급')).toBeNull()
  expect(screen.getByText('자세히 알아보기').closest('details')?.open).toBe(false)
  cleanup()
 }
})
it('shows success and failure separately and includes tiny mythic odds without rounding them away',()=>{
 const bait=catalog.fishing_baits.find(b=>b.id==='bait_starlight_wax')
 render(<BaitEffectDetails bait={bait}/>)
 expect(screen.getByRole('progressbar',{name:'낚시 성공률'}).getAttribute('aria-valuenow')).toBe('70')
 expect(screen.getByText('성공 70%')).toBeTruthy()
 expect(screen.getByText('실패 30%')).toBeTruthy()
 expect(screen.getByText('0.6%')).toBeTruthy()
})
