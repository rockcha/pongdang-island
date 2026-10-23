import {act,cleanup,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),load:vi.fn(),rewardSound:vi.fn()}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn(),playSaleSound:vi.fn(),playRewardSound:mocks.rewardSound}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'player'}}})}))
vi.mock('@/features/gold/api',()=>({loadGold:mocks.load,transactGold:vi.fn(),goldError:()=>''}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:mocks.rpc})}))
import {GoldProvider} from '@/features/gold/gold-provider'
import {actBaitProduction} from '@/features/production/bait-production-api'
import {claimGift} from '@/features/gifts/api'
import {claimAttendance} from '@/features/attendance/api'
import {announceBaitReceived} from '@/features/fishing/bait-reward-effect'
const wallet={gold:1000,inventory:{bait:10},delta:0,testClaimed:false,testEnabled:false}
beforeEach(()=>{mocks.load.mockResolvedValue(wallet)})
afterEach(()=>{cleanup();vi.resetAllMocks()})
async function mount(){render(<GoldProvider><p>미끼 수령</p></GoldProvider>);await waitFor(()=>expect(mocks.load).toHaveBeenCalledOnce())}
it('uses the settled production count, not the current catalogue output, and deduplicates a receipt replay',async()=>{
 await mount()
 mocks.rpc.mockResolvedValue({data:{sites:[{siteId:'site',bait_id:'bait',output_count:99}],receipt:{action:'claim',siteId:'site',count:3}},error:null})
 const args={p_action:'claim' as const,p_operation_id:'operation',p_facility:'site',p_quantity:1}
 await act(async()=>{await actBaitProduction(args);await actBaitProduction(args)})
 expect(screen.getByText('+3')).toBeTruthy()
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(1)
 expect(mocks.rewardSound).toHaveBeenCalledExactlyOnceWith('production:operation')
 expect(document.body.querySelector('.gold-change img')?.getAttribute('src')).toContain('pongdang-worm')
})
it('shows the actual gifted bait icon and quantity, and leaves failed claims without an effect',async()=>{
 await mount()
 mocks.rpc.mockResolvedValue({data:{reward_kind:'bait',reward_id:'bait_special',status:'claimed',quantity:2},error:null})
 await act(async()=>{await claimGift('gift');await claimGift('gift')})
 expect(screen.getByText('+2')).toBeTruthy();expect(screen.getByText('달빛 진주새우')).toBeTruthy()
 mocks.rpc.mockResolvedValue({data:null,error:new Error('network')})
 await act(async()=>{await expect(claimGift('failed')).rejects.toThrow('network')})
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(1)
})
it('shows one attendance bait and does not animate purchases, catalogue loads or an old-account response',async()=>{
 await mount();expect(document.body.querySelector('.gold-change')).toBeNull()
 mocks.rpc.mockResolvedValue({data:{reward:{claim_date:'2026-10-23',bait_id:'bait_epic'}},error:null})
 await act(async()=>{await claimAttendance('2026-10-23');await claimAttendance('2026-10-23')})
 expect(screen.getByText('+1')).toBeTruthy()
 await act(async()=>{announceBaitReceived('old-account','bait',100,0)})
 mocks.rpc.mockResolvedValue({data:{sites:[],receipt:{action:'buy',count:5}},error:null})
 await act(async()=>{await actBaitProduction({p_action:'buy',p_facility:'facility',p_operation_id:'buy',p_quantity:5})})
 expect(document.body.querySelectorAll('.gold-change')).toHaveLength(1)
 expect(document.body.querySelector('[data-gold-effects]')?.className).toContain('pointer-events-none')
})
