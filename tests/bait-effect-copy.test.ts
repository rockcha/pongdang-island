import {expect,it} from 'vitest'
import {baitEffects,fishingBaitEffect} from '@/features/fishing/bait-effects'
it('keeps hidden probabilities out of effect text while preserving guarantees',()=>{
 for(const effect of Object.values(baitEffects))expect(effect.replaceAll('100%','')).not.toMatch(/\d|×|%p/)
 expect(baitEffects.bait_grubby_magnet).toContain('쓰레기 포획 100%')
 expect(baitEffects.bait_safe).toContain('게이지 조작은 직접')
 const boosted=fishingBaitEffect('bait','',4100,4000)
 expect(boosted).toContain('낚싯대로 성공 확률 추가 증가')
 expect(boosted).not.toMatch(/\d/)
})
