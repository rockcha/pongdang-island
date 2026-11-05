import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import CalculationGame from '@/features/arcade/calculation-game'
import {createCountingGame} from '@/features/arcade/calculation-model'
import type {OrderState} from '@/features/arcade/aquarium-order-api'
const mocks=vi.hoisted(()=>({action:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'ordering'}}})}))
vi.mock('@/lib/account-query',()=>({useAccountResource:()=>({data:null})}))
vi.mock('@/features/arcade/aquarium-order-api',()=>({readOrderState:vi.fn(),orderAction:mocks.action}))
vi.mock('@/features/arcade/aquarium-order-ranking',()=>({AquariumOrderRanking:()=>null}))
vi.mock('@/features/arcade/game-modal',()=>({GameModal:({children}:any)=><div>{children(()=>{})}</div>}))
beforeEach(()=>{
 vi.clearAllMocks()
 vi.stubGlobal('Image',class{onload:(()=>void)|null=null;onerror=null;set src(_value:string){queueMicrotask(()=>this.onload?.())}})
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}})
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('starts practice and the next question without a briefing or a second start click',async()=>{
 render(<CalculationGame/>);const practice=await screen.findByRole('button',{name:'연습'})
 await waitFor(()=>expect(practice).toHaveProperty('disabled',false));fireEvent.click(practice)
 expect(await screen.findByRole('progressbar',{name:'남은 시간'})).toBeTruthy()
 expect(screen.queryByText('이번에 찾을 친구')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 fireEvent.click(await screen.findByRole('button',{name:'다음 문제'}))
 await waitFor(()=>expect(screen.getByRole('progressbar',{name:'남은 시간'}).getAttribute('aria-valuenow')).toBe('100'))
 expect(screen.getByRole('button',{name:'확인'})).toBeTruthy()
 expect(mocks.action).not.toHaveBeenCalled()
})
it('automatically sends begin exactly once after each live briefing',async()=>{
 const board=createCountingGame().rounds[0],at=new Date().toISOString()
 const base:OrderState={serverNow:at,run:{id:'run',round:0,phase:'briefing',board,order:board.initialOrder,score:0,correct:0,lives:3,outcome:null,deadline:null,finishedAt:null,abandoned:false}}
 const counting={...base,run:{...base.run!,phase:'counting',deadline:new Date(Date.now()+20000).toISOString()}}
 mocks.action.mockResolvedValueOnce(base).mockResolvedValueOnce(counting).mockResolvedValueOnce({...base,run:{...base.run!,phase:'feedback',outcome:'wrong',lives:2}}).mockResolvedValueOnce({...base,run:{...base.run!,round:1}}).mockResolvedValueOnce({...counting,run:{...counting.run!,round:1}})
 render(<CalculationGame/>);const live=await screen.findByRole('button',{name:'실전 (무료)'})
 await waitFor(()=>expect(live).toHaveProperty('disabled',false));fireEvent.click(live)
 await waitFor(()=>expect(mocks.action.mock.calls.map(([args])=>args.p_action)).toEqual(['start','begin']))
 fireEvent.click(await screen.findByRole('button',{name:'확인'}))
 fireEvent.click(await screen.findByRole('button',{name:'다음 문제'}))
 await waitFor(()=>expect(mocks.action.mock.calls.map(([args])=>args.p_action)).toEqual(['start','begin','answer','next','begin']))
 expect(screen.queryByText('이번에 찾을 친구')).toBeNull()
})
