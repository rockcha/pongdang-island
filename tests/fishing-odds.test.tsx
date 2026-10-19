import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {FishingOdds} from '@/features/fishing/fishing-odds'
import type {FishingBait} from '@/features/fishing/api'
const bait={id:'bait',effect_kind:'fish',common_bp:7700,rare_bp:2000,epic_bp:270,mythic_bp:30,successChanceBp:3500} as FishingBait
afterEach(cleanup)
it('separates the success chance from the conditional rarity distribution and updates with the bait',()=>{
 const view=render(<FishingOdds bait={bait}/>)
 for(const value of ['35%','77%','20%','2.7%','0.3%'])expect(screen.getByText(value)).toBeTruthy()
 expect(screen.getByText('성공 시 등급 확률')).toBeTruthy()
 view.rerender(<FishingOdds bait={{...bait,id:'bait_special',successChanceBp:7200,common_bp:0,rare_bp:9700}}/>)
 expect(screen.getByText('72%')).toBeTruthy()
 expect(screen.queryByText('35%')).toBeNull()
})
it('does not invent a rarity distribution for decoration bait',()=>{
 render(<FishingOdds bait={{...bait,effect_kind:'decoration',common_bp:0,rare_bp:0,epic_bp:0,mythic_bp:0}}/>)
 expect(screen.getByText('장식물 전용')).toBeTruthy()
 expect(screen.queryByRole('list')).toBeNull()
})
