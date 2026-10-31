import {useState} from 'react'
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MerchantRoom} from '@/features/exploration/merchant-room'
import {ShamanRoom} from '@/features/exploration/shaman-room'
import {enterShopkeeper} from '@/features/exploration/shop-state'
import {getShopkeeper,type ShopkeeperId} from '@/features/exploration/shopkeepers'
import {floorMerchantGoods,newPractice,type PracticeState} from '@/features/exploration/practice-state'
import {shamanSpells} from '@/features/exploration/shaman-stock'
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
afterEach(()=>{cleanup();vi.useRealTimers()})
function show(id:ShopkeeperId,gold=100000){
 const profile=getShopkeeper(id),initial=enterShopkeeper({...newPractice(),gold},profile,()=>0)
 function Harness(){const [state,onChange]=useState<PracticeState>(initial);const props={state,onChange,onDescend:()=>{},onTalk:()=>{}};return profile.kind==='magic'?<ShamanRoom {...props}/>:<MerchantRoom {...props}/>}
 render(<Harness/>);return initial
}
function open(){if(screen.queryByRole('dialog'))return;fireEvent.click(screen.getByRole('button',{name:/^(구매한다|마법을 살펴본다|더 구매할래요)$/}))}
function buy(name:string){if(!screen.queryByRole('heading',{name,level:4})){fireEvent.click(screen.getByRole('button',{name:name.includes('포션')?'포션':'방어구',exact:true}))}const article=screen.getByRole('heading',{name,level:4}).closest('article')!;fireEvent.click(within(article).getByRole('button',{name:/^(구매|배우기)$|개 구매$/}))}
it.each([{id:'hasan',kind:'weapon'},{id:'karim',kind:'armor'},{id:'hasan',kind:'potion'},{id:'nadim',kind:'magic'}] as const)('shows $kind image and success only after buying, then clears it',async({id,kind})=>{
 vi.useFakeTimers();const state=show(id)
 const item=kind==='magic'?shamanSpells.find(x=>x.id===state.shamanStock!.spellIds[0])!:floorMerchantGoods(state).find(x=>x.kind===kind)!
 open();buy(item.name)
 const notice=screen.getByRole('status',{name:'구매 알림'});expect(notice.textContent).toContain('구매 완료');expect(notice.textContent).toContain(item.name)
 expect(notice.querySelector('img')?.getAttribute('src')).toBe(kind==='magic'?(item as typeof shamanSpells[number]).image:'image' in item?item.image:'gear' in item?item.gear?.image:undefined)
 await act(async()=>{await vi.advanceTimersByTimeAsync(1900)})
 expect(screen.queryByRole('status',{name:'구매 알림'})).toBeNull()
})
it('restarts feedback for consecutive potion purchases without an old timer clearing the new one',async()=>{
 vi.useFakeTimers();show('hasan');open();buy('마나 포션')
 await act(async()=>{await vi.advanceTimersByTimeAsync(1000)})
 open();buy('체력 포션');expect(screen.getByRole('status',{name:'구매 알림'}).textContent).toContain('체력 포션')
 await act(async()=>{await vi.advanceTimersByTimeAsync(1000)})
 expect(screen.getByRole('status',{name:'구매 알림'}).textContent).toContain('체력 포션')
 await act(async()=>{await vi.advanceTimersByTimeAsync(900)})
 expect(screen.queryByRole('status',{name:'구매 알림'})).toBeNull()
})
it('does not celebrate a blocked purchase',()=>{
 show('hasan',0);open();fireEvent.click(screen.getByRole('button',{name:'포션',exact:true}));const article=screen.getByRole('heading',{name:'체력 포션'}).closest('article')!
 fireEvent.click(within(article).getByRole('button',{name:'체력 포션 1개 구매'}))
 expect(document.querySelector('.exploration-purchase-overlay')).toBeNull()
})
