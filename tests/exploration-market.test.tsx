import {getShopkeeper} from '@/features/exploration/shopkeepers'
import {afterEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {useState} from 'react'
import {drawFloorMarket,merchantTierBands,merchantTierChances} from '@/features/exploration/merchant-stock'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {buyMerchantItem,floorMerchantGoods,grantPracticeSupplies,newPractice,potionBlock,usePotion,playerMaxHp,type PracticeState} from '@/features/exploration/practice-state'
import {MerchantRoom} from '@/features/exploration/merchant-room'

const purchaseSound=vi.hoisted(()=>vi.fn())
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:purchaseSound}))

afterEach(()=>{cleanup();purchaseSound.mockClear();vi.useRealTimers()})
const rolls=(...values:number[])=>()=>values.shift()??.99
it.each(merchantTierBands)('uses the requested probabilities through floor $through',band=>{
 const start=band.through-9
 expect(merchantTierChances(start)).toEqual(band)
 expect(merchantTierChances(band.through)).toEqual(band)
 expect(band.starter+band.advanced+band.ultimate).toBe(100)
 for(const roll of [0,.099999,.1,.199999,.2,.299999,.3,.349999,.35,.449999,.45,.499999,.5,.599999,.6,.999999]){
  const market=drawFloorMarket(start,rolls(.99,roll,0,roll,0,roll,0,roll,0,roll,0,roll,0))
  const expected=roll*100<band.ultimate?'ultimate':roll*100<band.ultimate+band.advanced?'advanced':'starter'
  expect(market.weaponIds.map(id=>explorationWeapons.find(item=>item.id===id)!.tier)).toEqual(Array(3).fill(expected))
  expect(market.armorIds.map(id=>explorationArmor.find(item=>item.id===id)!.tier)).toEqual(Array(3).fill(expected))
  expect(new Set(market.weaponIds).size).toBe(3)
  expect(new Set(market.armorIds).size).toBe(3)
 }
})
it('rolls merchant appearance once per floor at exactly twenty percent, in at most one door',()=>{
 for(const floor of [1,10,11,50,51,70,100]){
  expect(drawFloorMarket(floor,rolls(.199999,0)).doors.filter(type=>type==='merchant-hasan')).toHaveLength(1)
  expect(drawFloorMarket(floor,rolls(.2)).doors).not.toContain('merchant-hasan')
 }
 const placements=[0,.34,.99].map(position=>drawFloorMarket(1,rolls(0,position)).doors.indexOf('merchant-hasan'))
 expect(placements).toEqual([0,1,2])
})
it('rolls each of the six equipment slots independently and always includes both potions',()=>{
 const state=newPractice(),market=drawFloorMarket(51,rolls(.99,0,0,.1,0,.6,0,.09,0,.11,0,.99,0))
 const stocked={...state,market}
 expect(market.weaponIds.map(id=>explorationWeapons.find(item=>item.id===id)!.tier)).toEqual(['ultimate','advanced','starter'])
 expect(market.armorIds.map(id=>explorationArmor.find(item=>item.id===id)!.tier)).toEqual(['ultimate','advanced','starter'])
 expect(floorMerchantGoods(stocked).map(item=>item.kind)).toEqual(['weapon','weapon','weapon','armor','armor','armor','potion','potion'])
 const selected=market.weaponIds[0],weapon=explorationWeapons.find(item=>item.id===selected)!
 const bought=buyMerchantItem({...stocked,gold:10000},selected)
 expect(bought.weapons).toContain(weapon)
 expect(bought.market).toBe(market)
 expect(bought.gold).toBe(10000-weapon.price)
 const unlisted=explorationWeapons.find(item=>!market.weaponIds.includes(item.id))!
 expect(buyMerchantItem(stocked,unlisted.id)).toBe(stocked)
})
it('stacks always-stocked potions despite full equipment bags and enforces gold and recovery limits',()=>{
 const initial=grantPracticeSupplies(newPractice())
 const first=buyMerchantItem(initial,'health-potion'),second=buyMerchantItem(first,'health-potion')
 expect(second.potions.health).toBe(2);expect(second.gold).toBe(initial.gold-200)
 expect(buyMerchantItem({...initial,gold:99},'health-potion').potions.health).toBe(0)
 expect(usePotion(second,'health')).toBe(second)
 const healed=usePotion({...second,hp:95},'health')
 expect(healed.hp).toBe(playerMaxHp(healed));expect(healed.potions.health).toBe(1)
 const burned=usePotion({...second,hp:50,playerEffects:[{kind:'burn',amount:40,turns:2}]},'health')
 expect(burned.hp).toBe(68)
 const mana=buyMerchantItem({...initial,mp:37},'mana-potion')
 expect(usePotion(mana,'mana').mp).toBe(40)
 const active={...second,hp:50,combat:{enemyHp:48,turn:0,status:'active' as const}}
 expect(usePotion(active,'health')).toBe(active)
 expect(buyMerchantItem(active,'health-potion')).toBe(active)
 expect(potionBlock({...second,potions:{health:0,mana:0}},'health')).toBeTruthy()
})
it('removes purchased gear without rerolling the remaining offers',async()=>{
 const initial=newPractice(()=>0)
 function Harness(){const [state,setState]=useState<PracticeState>(initial);return <MerchantRoom state={state} onChange={setState} onDescend={()=>{}} onTalk={()=>{}}/>}
 render(<Harness/>)
 fireEvent.click(screen.getByRole('button',{name:'구매한다'}))
 const names=within(screen.getByRole('dialog')).getAllByRole('heading',{level:4}).map(item=>item.textContent)
 expect(names).toHaveLength(3)
 const weapon=screen.getByRole('region',{name:'무기'})
 fireEvent.click(within(weapon).getAllByRole('button',{name:'구매',exact:true})[0])
 expect(purchaseSound).toHaveBeenCalledTimes(1)
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(getShopkeeper('hasan').purchases.some(line=>document.querySelector('.exploration-npc-quote')?.textContent?.includes(line))).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'더 구매할래요'}))
 fireEvent.click(screen.getByRole('button',{name:'하산에게 돌아가기'}))
 fireEvent.click(screen.getByRole('button',{name:'더 구매할래요'}))
 expect(within(screen.getByRole('dialog')).getAllByRole('heading',{level:4}).map(item=>item.textContent)).toEqual(names.slice(1))
 expect(screen.queryByRole('heading',{name:names[0]!})).toBeNull()
})
it('plays a distinct purchase chime for each potion and waits for an explicit descent choice',async()=>{
 const descend=vi.fn()
 function Harness(){const [state,setState]=useState(newPractice(()=>0));return <MerchantRoom state={state} onChange={setState} onDescend={descend} onTalk={()=>{}}/>}
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'구매한다'}))
 fireEvent.click(screen.getByRole('button',{name:'포션',exact:true}))
 for(let count=1;count<=2;count++){
  const potion=screen.getByRole('heading',{name:'체력 포션'}).closest('article')!
  fireEvent.click(within(potion).getByRole('button',{name:'체력 포션 1개 구매'}))
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(purchaseSound).toHaveBeenCalledTimes(count)
  expect(descend).not.toHaveBeenCalled()
 }
 expect(purchaseSound.mock.calls[0][0]).not.toBe(purchaseSound.mock.calls[1][0])
 fireEvent.click(screen.getByRole('button',{name:'하산에게 돌아가기'}))
 vi.useFakeTimers()
 fireEvent.click(screen.getByRole('button',{name:'이제 됐어요'}));expect(descend).not.toHaveBeenCalled()
 await act(async()=>{await vi.advanceTimersByTimeAsync(5000)})
 expect(descend).toHaveBeenCalledTimes(1)
})

it('buys potion batches atomically and rejects invalid or unaffordable quantities',()=>{
 const state={...newPractice(()=>0),gold:550}
 const next=buyMerchantItem(state,'health-potion',5)
 expect(next.gold).toBe(50);expect(next.potions.health).toBe(5);expect(state.potions.health).toBe(0)
 for(const quantity of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER,6])expect(buyMerchantItem(state,'health-potion',quantity)).toBe(state)
 expect(buyMerchantItem(state,state.market.weaponIds[0],2)).toBe(state)
})
it('updates batch total, keeps the shop open and limits maximum to available gold',()=>{
 function Harness(){const [state,setState]=useState({...newPractice(()=>0),gold:650});return <MerchantRoom state={state} onChange={setState} onDescend={()=>{}} onTalk={()=>{}}/>}
 render(<Harness/>);fireEvent.click(screen.getByRole('button',{name:'구매한다'}));fireEvent.click(screen.getByRole('button',{name:'포션',exact:true}))
 fireEvent.change(screen.getByRole('spinbutton',{name:'체력 포션 구매 수량'}),{target:{value:'5'}})
 expect(screen.getByRole('button',{name:'체력 포션 5개 구매'}).textContent).toContain('500')
 fireEvent.click(screen.getByRole('button',{name:'체력 포션 5개 구매'}))
 expect(screen.getByRole('dialog')).toBeTruthy();expect(screen.getByText(/보유 5개/)).toBeTruthy()
 expect(screen.getByRole('status',{name:'구매 알림'}).textContent).toContain('×5')
 const mana=screen.getByRole('heading',{name:'마나 포션'}).closest('article')!
 fireEvent.click(within(mana).getByRole('button',{name:'최대'}))
 expect((screen.getByRole('spinbutton',{name:'마나 포션 구매 수량'}) as HTMLInputElement).value).toBe('1')
 fireEvent.change(screen.getByRole('spinbutton',{name:'마나 포션 구매 수량'}),{target:{value:'2'}})
 expect((screen.getByRole('button',{name:'마나 포션 2개 구매'}) as HTMLButtonElement).disabled).toBe(true)
})
