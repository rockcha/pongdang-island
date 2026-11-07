import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {FarmTradePanel} from '@/features/farm/market-panel'
import {FarmShopItemPurchase} from '@/features/farm/shop-item-purchase'
import {TileShopPanel} from '@/features/farm/tile-shop-panel'
import {FarmSupplyShop} from '@/features/farm/supply-shop'
import {ProcessingWorkshop} from '@/features/farm/processing-workshop'
import {MillWorkshop} from '@/features/farm/mill-workshop'
import {ButcherWorkshop} from '@/features/farm/butcher-workshop'
import {LandPurchaseDialog} from '@/features/farm/land-controls'
import {FoodSalePanel} from '@/features/farm/food-sale-panel'
afterEach(cleanup)

it.each(['seed','building','tile','supply','craft','mill','butcher','land','sale'])('allows clearing and replacing the quantity in %s without submitting an empty amount',async kind=>{
 const state=initialTopview(),onAction=vi.fn(),onBuy=vi.fn(()=>true)
 let input:HTMLElement,submit:HTMLButtonElement,quantity=3,expected:unknown[]
 const button=(selector:string)=>document.querySelector(selector) as HTMLButtonElement
 if(kind==='seed'){
  render(<FarmTradePanel kind="seedShop" state={state} lastPurchasedSeed="carrot" onAction={onAction}/>);input=screen.getByLabelText('거래 수량');submit=screen.getByRole('button',{name:'당근 종자 구매'});quantity=15;expected=[{type:'seed',good:'carrotSeed',quantity}]
 }else if(kind==='building'){
  render(<FarmShopItemPurchase kind="mill" state={state} onBuy={onBuy}/>);input=screen.getByLabelText('제분소 구매 수량');submit=button('.farm-shop-card-buy');expected=['mill',quantity]
 }else if(kind==='tile'){
  render(<TileShopPanel state={state} onBuy={onBuy}/>);input=screen.getByLabelText('흙길 구매 수량');submit=button('.farm-shop-buy');expected=[quantity,'dirt']
 }else if(kind==='supply'){
  render(<FarmSupplyShop state={state} onAction={onAction}/>);input=screen.getByLabelText('비료 구매 수량');submit=screen.getByRole('button',{name:'비료 구매'});expected=[{type:'buySupply',supply:'fertilizer',quantity}]
 }else if(kind==='craft'){
  state.simulation.inventory.milk=30;render(<ProcessingWorkshop kind="dairy" maxOutput={10} buildingId={100} simulation={state.simulation} now={0} onAction={onAction}/>);fireEvent.click(screen.getByRole('button',{name:'버터 선택'}));input=screen.getByLabelText('버터 제작 수량');submit=screen.getByRole('button',{name:'버터 만들기'});expected=[{type:'craft',recipe:'butter',quantity}]
 }else if(kind==='mill'){
  render(<MillWorkshop maxOutput={10} buildingId={100} simulation={state.simulation} now={0} onAction={onAction}/>);input=screen.getByLabelText('밀 수량');submit=screen.getByRole('button',{name:'밀 제분 시작'});expected=[{type:'mill',product:'flour',quantity}]
 }else if(kind==='butcher'){
  state.stored=['cow','cow','cow'];render(<ButcherWorkshop state={state} buildingId={28} now={0} onAction={onAction}/>);input=screen.getByLabelText('투입 동물 수');submit=button('.farm-butcher>.farm-sim-primary');quantity=2;expected=[{type:'butcher',animal:'cow',quantity}]
 }else if(kind==='land'){
  render(<LandPurchaseDialog open gold={state.gold} onOpenChange={vi.fn()} onBuy={onBuy}/>);input=screen.getByLabelText('땅 구매 수량');submit=button('.farm-land-purchase .farm-sim-primary');quantity=15;expected=[quantity]
 }else{
  state.simulation.inventory.butterPotato=10;render(<FoodSalePanel state={state} onAction={onAction}/>);fireEvent.click(screen.getByRole('button',{name:'버터감자 선택'}));fireEvent.click(screen.getByRole('button',{name:'버터감자 수량 변경'}));input=screen.getByLabelText('버터감자 판매 수량');submit=button('.farm-food-summary>.farm-sim-primary');expected=[{type:'marketSellBatch',items:[{good:'butterPotato',quantity}]}]
 }
 fireEvent.change(input,{target:{value:''}})
 expect(input).toHaveProperty('value','');expect(input).toHaveProperty('disabled',false)
 expect(submit).toHaveProperty('disabled',true);fireEvent.click(submit)
 expect(onAction).not.toHaveBeenCalled();expect(onBuy).not.toHaveBeenCalled()
 fireEvent.change(input,{target:{value:String(quantity)}})
 expect(input).toHaveProperty('value',String(quantity));expect(submit).toHaveProperty('disabled',false)
 await act(async()=>fireEvent.click(submit))
 expect(['building','tile','land'].includes(kind)?onBuy:onAction).toHaveBeenCalledExactlyOnceWith(...expected)
})
it('keeps an empty draft while editing and restores a safe quantity on blur',()=>{
 const state=initialTopview(),onBuy=vi.fn();const view=render(<FarmShopItemPurchase kind="mill" state={state} onBuy={onBuy}/>)
 const input=screen.getByLabelText('제분소 구매 수량')
 fireEvent.change(input,{target:{value:''}});view.rerender(<FarmShopItemPurchase kind="mill" state={{...state,gold:14000}} onBuy={onBuy}/>)
 expect(input).toHaveProperty('value','')
 fireEvent.blur(input);expect(input).toHaveProperty('value','1');expect(onBuy).not.toHaveBeenCalled()
})
it('keeps maximum and step buttons working after manual edits and clamps to available stock',()=>{
 const state=initialTopview();render(<MillWorkshop maxOutput={10} buildingId={100} simulation={state.simulation} now={0} onAction={vi.fn()}/>)
 const input=screen.getByLabelText('밀 수량')
 fireEvent.change(input,{target:{value:''}});fireEvent.click(screen.getByRole('button',{name:'전체'}));expect(input).toHaveProperty('value','4')
 fireEvent.change(input,{target:{value:'99999'}});expect(input).toHaveProperty('value','4')
 fireEvent.click(screen.getByRole('button',{name:'밀 수량 줄이기'}));expect(input).toHaveProperty('value','3')
})
