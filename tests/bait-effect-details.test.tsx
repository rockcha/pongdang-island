import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {BaitEffectDetails} from '@/features/fishing/bait-effect-details'
import type {FishingBait} from '@/features/fishing/api'
const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
afterEach(cleanup)
it('distinguishes shared species from common grade and mythic grade from fish-only',()=>{
 render(<BaitEffectDetails bait={catalog.fishing_baits.find(b=>b.id==='bait_snowflake_salt')}/> )
 expect(screen.getByText('공통종만 포획')).toBeTruthy()
 expect(screen.getByText(/토착종·외지종과 장식물은 제외/)).toBeTruthy()
 expect(screen.getByText('0.3%')).toBeTruthy()
 cleanup()
 render(<BaitEffectDetails bait={catalog.fishing_baits.find(b=>b.id==='bait_shooting_star_tail')}/> )
 expect(screen.getByText('일반 쓰레기')).toBeTruthy()
 expect(screen.getByText('신화 등급')).toBeTruthy()
 expect(screen.getByText('99%')).toBeTruthy()
 expect(screen.getByText('1%')).toBeTruthy()
 expect(screen.getByText(/신화는 물고기·쓰레기·장식물 중/)).toBeTruthy()
 expect(screen.queryByText(/물고기 전용/)).toBeNull()
})
it('shows grade-first decoration odds',()=>{
 const bait=catalog.fishing_baits.find(b=>b.id==='bait_magnet')
 render(<BaitEffectDetails bait={{...bait,successChanceBp:7000}}/>)
 expect(screen.getByText('70%')).toBeTruthy()
 for(const odds of ['83.2%','15%','1.5%','0.3%'])expect(screen.getByText(odds)).toBeTruthy()
 expect(screen.getByText('등급을 먼저 추첨한 뒤 해당 등급의 장식물을 인양해요.')).toBeTruthy()
})
it('shows separate success and conditional grade odds for every new bait with a real image',()=>{
 for(const bait of catalog.fishing_baits.filter(b=>b.fish_only&&!b.alternating)){
  render(<BaitEffectDetails bait={bait as FishingBait}/>)
  expect(screen.getByText('낚시 성공률').nextElementSibling?.textContent).toBe(`${bait.success_chance_bp/100}%`)
  expect(screen.getByText('성공 시 등급 확률')).toBeTruthy()
  expect(screen.getByText(/물고기 전용/).textContent).toContain('쓰레기·장식물 제외')
  const localImage=bait.image_path.includes('/items/baits/')?'/items/baits/'+bait.image_path.split('/').at(-1):bait.image_path
  expect(existsSync('public'+localImage)).toBe(true)
  cleanup()
 }
})
it('shows the server-provided next jelly phase and failure progression',()=>{
 const bait=catalog.fishing_baits.find(b=>b.alternating)
 render(<BaitEffectDetails bait={{...bait,nextRarity:'rare'}}/>)
 expect(screen.getByLabelText('희귀 전용 · 다음 차례')).toBeTruthy()
 expect(screen.getByText(/실패해도 다음 차례/)).toBeTruthy()
 expect(screen.queryByText('성공 시 등급 확률')).toBeNull()
 expect(screen.getByText('다음 차례').closest('[aria-label]')?.getAttribute('aria-label')).toContain('희귀')
})
it('keeps fallback-dependent trash and undiscovered pools out of fixed grade percentages',()=>{
 for(const id of ['bait_grubby_magnet','bait_first_greeting']){
  render(<BaitEffectDetails bait={catalog.fishing_baits.find(b=>b.id===id)}/>)
  expect(screen.queryByText('성공 시 등급 확률')).toBeNull()
  expect(screen.getByText('자세히 알아보기').closest('details')?.open).toBe(false)
  cleanup()
 }
})
it('keeps success compact and tiny mythic odds readable',()=>{
 const bait=catalog.fishing_baits.find(b=>b.id==='bait_starlight_wax')
 render(<BaitEffectDetails bait={bait}/>)
 expect(screen.getByText('낚시 성공률').nextElementSibling?.textContent).toBe('70%')
 expect(screen.queryByRole('progressbar')).toBeNull()
 expect(screen.getByText('0.6%')).toBeTruthy()
})
