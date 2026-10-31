import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {StrictMode} from 'react'
import {afterEach,expect,it,vi} from 'vitest'
import {ExplorationGame} from '@/features/exploration/exploration-game'
import * as practice from '@/features/exploration/practice-state'
import {queueForcedMerchant} from '@/features/exploration/merchant-pity'
import {drawPracticeFloor} from '@/features/exploration/campaign'
vi.mock('@/features/arcade/game-leave-guard',()=>({GameLeaveGuard:()=>null}))
vi.mock('@/features/profile/player-avatar',()=>({PlayerAvatar:()=>null}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
vi.mock('@/features/exploration/exploration-audio',()=>({createExplorationAudio:()=>({startMusic(){},unlock(){},play(){},dispose(){},startDescent(){},stopDescent(){}})}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()})
const advance=async(ms:number)=>{await act(async()=>{await vi.advanceTimersByTimeAsync(ms)})}
it('opens the guaranteed merchant before any door choice and returns to the same floor after trading',async()=>{
 const initial=practice.newPractice(()=>0,'practice'),state=queueForcedMerchant({...initial,gold:1000,market:drawPracticeFloor(11,()=>0)})
 vi.spyOn(practice,'newPractice').mockReturnValue(state);vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true}))
 render(<StrictMode><ExplorationGame nickname="퐁이" mode="practice" onLeave={()=>{}}/></StrictMode>);await advance(100)
 expect(screen.getByRole('region',{name:'상인 방'})).toBeTruthy()
 expect(screen.queryByRole('group',{name:'지하 11층의 세 문'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'구매한다'}));fireEvent.click(screen.getByRole('button',{name:'포션',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'체력 포션 1개 구매'}))
 expect(screen.getByText(/보유 1개/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'하산에게 돌아가기'}))
 fireEvent.click(screen.getByRole('button',{name:'문으로 돌아간다'}));await advance(5000)
 expect(screen.getByRole('group',{name:'지하 11층의 세 문'})).toBeTruthy()
 expect(screen.queryByRole('region',{name:'상인 방'})).toBeNull()
 expect(screen.queryByRole('group',{name:'지하 12층의 세 문'})).toBeNull()
})
