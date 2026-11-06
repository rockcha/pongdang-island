import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {LandPurchaseDialog} from '@/features/farm/land-controls'
import {buyLandStock} from '@/features/farm/land-tools'
import {initialTopview} from '@/features/farm/topview-model'

afterEach(cleanup)
it('buys the entered land quantity at 100 gold per cell without preset buttons',()=>{
 const onBuy=vi.fn(()=>true),onOpenChange=vi.fn()
 render(<LandPurchaseDialog open gold={15000} onBuy={onBuy} onOpenChange={onOpenChange}/> )
 for(const name of ['1칸','5칸','10칸'])expect(screen.queryByRole('button',{name,exact:true})).toBeNull()
 fireEvent.change(screen.getByRole('textbox',{name:'땅 구매 수량'}),{target:{value:'3'}})
 fireEvent.click(screen.getByRole('button',{name:'3칸 구매 · 300골드'}))
 expect(onBuy).toHaveBeenCalledWith(3)
 expect(onOpenChange).toHaveBeenCalledWith(false)
 expect(buyLandStock(initialTopview(),3).gold).toBe(14700)
})
it('blocks purchases beyond the available balance',()=>{
 const onBuy=vi.fn(()=>true)
 render(<LandPurchaseDialog open gold={100} onBuy={onBuy} onOpenChange={()=>{}}/> )
 fireEvent.change(screen.getByRole('textbox',{name:'땅 구매 수량'}),{target:{value:'2'}})
 expect(screen.getByRole('button',{name:'2칸 구매 · 200골드'})).toHaveProperty('disabled',true)
 expect(screen.getByRole('alert')).toBeTruthy()
 expect(buyLandStock({...initialTopview(),gold:99},1).landStock).toBe(0)
 expect(onBuy).not.toHaveBeenCalled()
})
