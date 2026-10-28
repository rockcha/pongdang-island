import {render,screen,cleanup} from '@testing-library/react'
import {afterEach,it,expect,vi} from 'vitest'
import {ShopSalePrice} from '@/features/exchange/shop-sale-price'
import {AssetView} from '@/features/exchange/asset-view'
import type {ExchangeAsset} from '@/features/exchange/api'
vi.mock('@/features/gold/gold-provider',()=>({GoldIcon:()=>null}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:()=>null}))
afterEach(cleanup)
const fish:ExchangeAsset={kind:'collectible',id:'fish',name:'복어',quantity:10,thumbnail_path:null,sell_price:30}
it('labels a per-item shop sale price separately from quantity, including zero',()=>{
 const view=render(<ShopSalePrice asset={fish}/>)
 expect(screen.getByLabelText('상점 판매가 개당 30골드')).toBeTruthy()
 expect(screen.getByText('/ 개')).toBeTruthy()
 view.rerender(<ShopSalePrice asset={{...fish,sell_price:0}} compact/>)
 expect(screen.getByLabelText('상점 판매가 개당 0골드')).toBeTruthy()
 expect(screen.getByText('상점가')).toBeTruthy()
})
it('omits fuel, gold and unknown prices rather than inventing a value',()=>{
 const {container}=render(<><ShopSalePrice asset={{...fish,kind:'fuel'}}/><ShopSalePrice asset={{...fish,kind:'gold'}}/><ShopSalePrice asset={{...fish,sell_price:null}}/></>)
 expect(container.textContent).toBe('')
})
it('shows each bundle item price, without presenting the first price as a bundle price',()=>{
 render(<AssetView asset={{...fish,items:[fish,{...fish,id:'second',name:'해삼',sell_price:50}]}}/>)
 expect(screen.getAllByLabelText(/상점 판매가 개당/)).toHaveLength(2)
 expect(screen.getByLabelText('상점 판매가 개당 50골드')).toBeTruthy()
})
