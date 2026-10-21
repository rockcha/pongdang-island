import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {FishingOdds} from '@/features/fishing/fishing-odds'
import type {FishingBait} from '@/features/fishing/api'
import type {FishingRod} from '@/features/fishing/fishing-rods'
const bait={id:'bait',effect_kind:'fish',common_bp:7700,rare_bp:2000,epic_bp:270,mythic_bp:30,successChanceBp:3500} as FishingBait
afterEach(cleanup)
it('shows the bait and rod success contributions and live rarity changes',()=>{
 const view=render(<FishingOdds bait={{...bait,name:'지렁이',baseSuccessChanceBp:3500,successChanceBp:3600}} rod={{name:'청동 낚싯대',effect:'성공률 상승'} as FishingRod}/> )
 fireEvent.click(screen.getByRole('button',{name:'낚시 잘하는 꿀팁'}))
 expect(screen.getByRole('region',{name:'낚시 방법'})).toBeTruthy()
 expect(screen.getByText('게이지가 꽉 차기 전에 손을 떼세요.')).toBeTruthy()
 expect(screen.getByText('36%')).toBeTruthy()
 view.rerender(<FishingOdds bait={{...bait,id:'bait_special',name:'초록 미끼',baseSuccessChanceBp:7000,successChanceBp:7100,common_bp:0,rare_bp:9700}} rod={{name:'청동 낚싯대',effect:'성공률 상승'} as FishingRod}/>)
 expect(screen.getByText('71%')).toBeTruthy()
 expect(screen.queryByLabelText('기본 대비 성공률 변화')).toBeNull()
 expect(screen.getByLabelText('희귀 기본 대비 변화').textContent).toBe('+82%p')
 expect(screen.getByText('성공률 +35%p')).toBeTruthy()
 expect(screen.getByText('성공률 +1%p')).toBeTruthy()
})
it('separates the success chance from the conditional rarity distribution and updates with the bait',()=>{
 const view=render(<FishingOdds bait={bait}/>)
 expect(screen.queryByRole('dialog')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'낚시 잘하는 꿀팁'}))
 expect(screen.getAllByText('35%')).toHaveLength(2)
 for(const value of ['77%','20%','2.7%','0.3%'])expect(screen.getByText(value)).toBeTruthy()
 expect(screen.getByText('성공 시 등급 확률')).toBeTruthy()
 view.rerender(<FishingOdds bait={{...bait,id:'bait_special',successChanceBp:7200,common_bp:0,rare_bp:9700}}/>)
 expect(screen.getByText('72%')).toBeTruthy()
 expect(within(screen.getByRole('dialog')).getByText('기본 성공률 · 지렁이')).toBeTruthy()
 expect(screen.getByText(/발견 확률이 상승/)).toBeTruthy()
})
it('does not invent a rarity distribution for decoration bait',()=>{
 render(<FishingOdds bait={{...bait,effect_kind:'decoration',common_bp:0,rare_bp:0,epic_bp:0,mythic_bp:0}}/>)
 fireEvent.click(screen.getByRole('button',{name:'낚시 잘하는 꿀팁'}))
 expect(screen.getByText(/장식물 전용 미끼예요/)).toBeTruthy()
 expect(within(screen.getByRole('region',{name:'등급별 확률'})).queryByRole('list')).toBeNull()
})
