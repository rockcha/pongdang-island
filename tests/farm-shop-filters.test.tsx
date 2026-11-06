import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {FarmShop} from '@/features/farm/farm-shop'
import {initialTopview,topviewItems} from '@/features/farm/topview-model'

afterEach(cleanup)
function setup(){render(<FarmShop state={initialTopview()} onBuy={vi.fn()} onBuyTiles={vi.fn()} onClose={()=>{}}/>)}
function expectPriceOrder(){
 const prices=screen.getAllByRole('article').map(card=>Object.values(topviewItems).find(item=>item.name===card.getAttribute('aria-label'))!.price)
 expect(prices).toEqual([...prices].sort((a,b)=>a-b))
}
it('sorts buildings by price and filters by purpose',()=>{
 setup();expectPriceOrder()
 fireEvent.click(within(screen.getByRole('navigation',{name:'건물 카테고리'})).getByRole('button',{name:'요리'}))
 expect(screen.getByRole('article',{name:'작은 빵집'})).toBeTruthy()
 expect(screen.queryByRole('article',{name:'제분소'})).toBeNull()
 expectPriceOrder()
})
it('filters decorations and preserves each tab selection',()=>{
 setup()
 fireEvent.click(screen.getByRole('button',{name:'장식',exact:true}))
 expectPriceOrder()
 fireEvent.click(screen.getByRole('button',{name:'다리',exact:true}))
 expect(screen.getAllByRole('article')).toHaveLength(3)
 expectPriceOrder()
 fireEvent.click(screen.getByRole('button',{name:'물 위 장식',exact:true}))
 expect(screen.getByRole('article',{name:'오리배'})).toBeTruthy()
 expect(screen.queryByRole('article',{name:'나무다리 1×1'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'건물',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'장식',exact:true}))
 expect(screen.getByRole('button',{name:'물 위 장식',exact:true}).getAttribute('aria-pressed')).toBe('true')
 fireEvent.click(within(screen.getByRole('navigation',{name:'장식물 카테고리'})).getByRole('button',{name:'전체'}))
 expect(screen.getByRole('article',{name:'꽃밭'})).toBeTruthy()
 expectPriceOrder()
})
