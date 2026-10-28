import {beforeEach,expect,it,vi} from 'vitest'
import {compareFleaPosts,readFleaComparison} from '@/features/flea-market/comparison'
import type {FleaPost} from '@/features/flea-market/api'
const api=vi.hoisted(()=>({read:vi.fn()}))
vi.mock('@/features/flea-market/api',()=>({readFlea:api.read}))
const make=(id:string,price:number,asset='fuel'):FleaPost=>({id,owner_id:'other',owner_name:'이웃',side:'sell',title:id,status:'active',escrow_gold:0,created_at:'2026-10-28T00:00:00Z',items:[{id:'line'+id,asset:{kind:'fuel',id:asset,name:asset,quantity:1},remaining:1,quantity:1,unit_price:price}]})
beforeEach(()=>vi.clearAllMocks())
it('compares only the same available asset and leaves the original feed untouched',()=>{
 const posts=[make('high',300),make('other',1,'other'),make('low',10),{...make('sold',1),items:[{...make('sold',1).items[0],remaining:0}]}]
 expect(compareFleaPosts(posts,'fuel:fuel','low').map(p=>p.id)).toEqual(['low','high'])
 expect(compareFleaPosts(posts,'fuel:fuel','high').map(p=>p.id)).toEqual(['high','low'])
 expect(posts[0].id).toBe('high')
})
it('includes cheaper posts beyond the first page before sorting',async()=>{
 const posts=Array.from({length:21},(_,i)=>make(String(i),100-i))
 api.read.mockImplementation(async filter=>({items:posts.slice(filter.offset,filter.offset+20),total:21}))
 const filter={side:'sell' as const,query:'fuel',kind:'all',mine:false,offset:0}
 const signal=new AbortController().signal
 const result=await readFleaComparison(filter,'fuel:fuel','low',signal)
 expect(result.total).toBe(21);expect(result.items[0].id).toBe('20')
 expect(api.read.mock.calls.map(c=>c[0].offset)).toEqual([0,20])
 expect(api.read.mock.calls.every(c=>c[1]===signal)).toBe(true)
})
it('stops additional page reads when the account query is aborted',async()=>{
 const controller=new AbortController()
 api.read.mockImplementationOnce(async()=>{controller.abort();return {items:[make('first',10)],total:40}})
 await expect(readFleaComparison({side:'sell',query:'fuel',kind:'all',mine:false,offset:0},'fuel:fuel','low',controller.signal)).rejects.toThrow()
 expect(api.read).toHaveBeenCalledTimes(1)
})
