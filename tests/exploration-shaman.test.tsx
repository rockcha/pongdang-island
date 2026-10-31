import {getShopkeeper} from '@/features/exploration/shopkeepers'
import {StrictMode,useState} from 'react'
import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {drawShamanStock,learnShamanSpell,shamanLearningBlock,shamanSpells} from '@/features/exploration/shaman-stock'
import {drawFloorMarket,merchantTierBands} from '@/features/exploration/merchant-stock'
import {newPractice,type PracticeState} from '@/features/exploration/practice-state'
import {ShamanRoom} from '@/features/exploration/shaman-room'

const purchaseSound=vi.hoisted(()=>vi.fn())
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:purchaseSound}))

afterEach(()=>{cleanup();purchaseSound.mockClear()})
const rolls=(...values:number[])=>()=>values.shift()??.99
it.each(merchantTierBands)('uses the equipment merchant tier chances through floor $through',band=>{
 for(const roll of [0,.09999,.1,.19999,.2,.3,.35,.45,.6,.99]){
  const stock=drawShamanStock(band.through,rolls(roll,0,roll,0,roll,0))
  const tier=roll*100<band.ultimate?'ultimate':roll*100<band.ultimate+band.advanced?'advanced':'starter'
  expect(stock.spellIds).toHaveLength(3);expect(new Set(stock.spellIds).size).toBe(3)
  expect(stock.spellIds.map(id=>shamanSpells.find(spell=>spell.id===id)!.tier)).toEqual(Array(3).fill(tier))
 }
})
it('does not add shaman rooms to the automatic floor draw',()=>{
 for(const floor of [1,11,51,71,100])for(const roll of [0,.19,.2,.5,.99])expect(drawFloorMarket(floor,()=>roll).doors).not.toContain('magic')
})
it('learns only a displayed, implemented spell once and rejects insufficient gold or stale stock',()=>{
 const initial={...newPractice(),shamanStock:drawShamanStock(1,()=>0)}
 const learned=learnShamanSpell(initial,'ember')
 expect(learned.gold).toBe(99750);expect(learned.spells.map(spell=>spell.id)).toEqual(['ember']);expect(learned.mp).toBe(40)
 expect(learned.shamanStock).toBe(initial.shamanStock)
 expect(learnShamanSpell(learned,'ember')).toBe(learned)
 expect(learnShamanSpell(initial,'sand')).toBe(initial)
 const poor={...initial,gold:249};expect(learnShamanSpell(poor,'ember')).toBe(poor)
 const stale={...initial,shamanStock:drawShamanStock(2,()=>0)};expect(learnShamanSpell(stale,'ember')).toBe(stale)
 const future={...initial,shamanStock:{floor:1,spellIds:['compressed-water-bolt']}}
 expect(shamanLearningBlock(future,'compressed-water-bolt')).toBeNull()
 expect(learnShamanSpell(future,'compressed-water-bolt').spells.some(spell=>spell.id==='compressed-water-bolt')).toBe(true)
})
it('removes learned spells without rerolling the other offers',async()=>{
 const initial={...newPractice(),shamanStock:drawShamanStock(1,()=>0)}
 function Harness(){const [state,setState]=useState<PracticeState>(initial);return <ShamanRoom state={state} onChange={setState} onDescend={()=>{}} onTalk={()=>{}}/>}
 render(<StrictMode><Harness/></StrictMode>);fireEvent.click(screen.getByRole('button',{name:'마법을 살펴본다'}))
 const names=within(screen.getByRole('dialog')).getAllByRole('heading',{level:4}).map(item=>item.textContent)
 expect(names).toHaveLength(3)
 const ember=screen.getByRole('heading',{name:'작은 불꽃'}).closest('article')!
 fireEvent.click(within(ember).getByRole('button',{name:'배우기'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(getShopkeeper('nadim').purchases.some(line=>document.querySelector('.exploration-npc-quote')?.textContent?.includes(line))).toBe(true)
 expect(purchaseSound).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByRole('button',{name:'더 구매할래요'}))
 expect(screen.queryByRole('heading',{name:'작은 불꽃'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'나딤에게 돌아가기'}));fireEvent.click(screen.getByRole('button',{name:'더 구매할래요'}))
 expect(within(screen.getByRole('dialog')).getAllByRole('heading',{level:4}).map(item=>item.textContent)).toEqual(names.filter(name=>name!=='작은 불꽃'))
})
it('does not play a purchase chime for unavailable or unaffordable lessons',()=>{
 const state={...newPractice(),gold:0,shamanStock:{floor:1,spellIds:['ember','compressed-water-bolt']}}
 render(<ShamanRoom state={state} onChange={()=>{}} onDescend={()=>{}} onTalk={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'마법을 살펴본다'}))
 for(const button of screen.getAllByRole('button',{name:'골드 부족'})){expect(button).toHaveProperty('disabled',true);fireEvent.click(button)}
 expect(purchaseSound).not.toHaveBeenCalled()
})
it('always mirrors the latest log under the shaman name and removes the browse icon',()=>{
 const state={...newPractice(),shamanStock:drawShamanStock(1,()=>0)},onTalk=vi.fn()
 const view=render(<ShamanRoom latestLog="첫 번째 로그" state={state} onChange={()=>{}} onDescend={()=>{}} onTalk={onTalk}/>)
 expect(document.querySelector('.exploration-npc-quote')?.textContent).toContain('첫 번째 로그')
 expect(screen.getByRole('button',{name:'마법을 살펴본다'}).querySelector('svg')).toBeNull()
 view.rerender(<ShamanRoom latestLog="마지막 로그가 바뀌었어요" state={state} onChange={()=>{}} onDescend={()=>{}} onTalk={onTalk}/>)
 expect(document.querySelector('.exploration-npc-quote')?.textContent).toContain('마지막 로그가 바뀌었어요')
 expect(document.querySelector('.exploration-npc-quote')?.textContent).not.toContain('첫 번째 로그')
})
