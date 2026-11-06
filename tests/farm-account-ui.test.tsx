import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {applyFarmCommand,initialAccountFarm} from '@/features/farm/account-engine'
import type {FarmAccountSnapshot} from '@/features/farm/account-api'
const sound=vi.hoisted(()=>({purchase:vi.fn()}))
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:sound.purchase,playSaleSound:vi.fn()}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
const snapshot=(gold=5000):FarmAccountSnapshot=>({state:{...initialAccountFarm(),gold},wallet:{gold,inventory:{},testClaimed:false,testEnabled:false},revision:0,serverNow:new Date().toISOString(),sampledAt:Date.now(),undo:null,receipt:null})
it('shows no spend, ownership or purchase celebration before the server confirms a purchase',async()=>{
 let resolve!:(value:FarmAccountSnapshot)=>void;const execute=vi.fn(()=>new Promise<FarmAccountSnapshot>(r=>{resolve=r})),s=snapshot()
 const view=(data:FarmAccountSnapshot)=><MemoryRouter><TopviewFarm account={{snapshot:data,busy:false,now:Date.now,execute}}/></MemoryRouter>
 const {rerender}=render(view(s));click('상점');click('제분소 구매 · 2000 G')
 expect(execute).toHaveBeenCalledWith({type:'buy',kind:'mill',quantity:1})
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('5,000')
 expect(document.querySelector('.farm-purchase-effect')).toBeNull();expect(sound.purchase).not.toHaveBeenCalled()
 const confirmed={...s,state:applyFarmCommand(s.state,{type:'buy',kind:'mill',quantity:1},Date.now()),revision:1}
 await act(async()=>{resolve(confirmed);rerender(view(confirmed))})
 await waitFor(()=>expect(document.querySelector('.farm-purchase-effect')).toBeTruthy())
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('3,000')
 expect(sound.purchase).toHaveBeenCalledTimes(1)
})
it('preserves balance and ownership after a rejected command, and hides practice reset in the real farm',async()=>{
 const execute=vi.fn().mockResolvedValue(null),s=snapshot()
 render(<MemoryRouter><TopviewFarm account={{snapshot:s,busy:false,now:Date.now,execute}}/></MemoryRouter>)
 click('보유 골드 안내');expect(screen.queryByRole('button',{name:'체험 초기화'})).toBeNull()
 expect(screen.getByText('실제 보유 골드를 사용하며 농장은 계정에 저장돼요.')).toBeTruthy()
 click('상점');click('제분소 구매 · 2000 G')
 await waitFor(()=>expect(execute).toHaveBeenCalledTimes(1))
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('5,000')
 expect(document.querySelector('.farm-purchase-effect')).toBeNull();expect(sound.purchase).not.toHaveBeenCalled()
})
