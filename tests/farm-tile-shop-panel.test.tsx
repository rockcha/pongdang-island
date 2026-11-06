import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {TileShopPanel} from '@/features/farm/tile-shop-panel'
import {initialTopview} from '@/features/farm/topview-model'
afterEach(cleanup)
it('shows six tiles with stock and prices and buys the chosen quantity',()=>{
 const state=initialTopview(),onBuy=vi.fn();state.tileStocks={stone:7}
 render(<TileShopPanel state={state} onBuy={onBuy}/>)
 expect(screen.getAllByRole('button',{name:/ 선택$/})).toHaveLength(6)
 expect(screen.getByText('보유 7개')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'징검돌 길 선택'}))
 fireEvent.change(screen.getByRole('spinbutton',{name:'징검돌 길 구매 수량'}),{target:{value:'10'}})
 fireEvent.click(screen.getByRole('button',{name:/징검돌 길 10개 구매 · 200\s*골드/}))
 expect(onBuy).toHaveBeenCalledWith(10,'stone')
})
it('limits quantity to affordable stock and disables purchase without gold',()=>{
 const state={...initialTopview(),gold:35},onBuy=vi.fn()
 const view=render(<TileShopPanel state={state} onBuy={onBuy}/>)
 expect(screen.getByRole('spinbutton',{name:'흙길 구매 수량'})).toHaveProperty('value','3')
 fireEvent.click(screen.getByRole('button',{name:'밝은 판석길 선택'}))
 expect(screen.getByRole('button',{name:'골드가 부족해요'})).toHaveProperty('disabled',true)
 view.rerender(<TileShopPanel state={{...state,gold:0}} onBuy={onBuy}/>)
 expect(screen.getByRole('button',{name:'골드가 부족해요'})).toHaveProperty('disabled',true)
 expect(onBuy).not.toHaveBeenCalled()
})
