import {beforeEach,expect,it,vi} from 'vitest'
import {readExchangeMarket} from '@/features/exchange/read-market'
import type {ExchangeListing} from '@/features/exchange/api'
const mock=vi.hoisted(()=>({read:vi.fn()}))
vi.mock('@/lib/client',()=>({createClient:()=>({rpc:(_name:string,args:unknown)=>({abortSignal:(signal:AbortSignal)=>mock.read(args,signal)})})}))
const listing=(id:string,kind:'fuel'|'collectible'='fuel'):ExchangeListing=>({id,owner_id:'me',owner_name:'이웃',side:'sell',status:'active',created_at:'2026-10-28T00:00:00Z',closed_at:null,taker_id:null,offer:{kind,id:'asset',name:'물품',quantity:1,thumbnail_path:null,subtype:kind==='collectible'?'fish':undefined},wanted:{kind:'gold',id:'gold',name:'골드',quantity:100,thumbnail_path:null}})
const filter={tab:'all',query:'',kind:'all',status:'all',offset:0}
beforeEach(()=>vi.clearAllMocks())
it('keeps normal browsing paginated and forwards the account abort signal',async()=>{
 const signal=new AbortController().signal
 mock.read.mockResolvedValue({data:{items:[listing('one')],total:40},error:null})
 expect((await readExchangeMarket({...filter,offset:20},signal)).total).toBe(40)
 expect(mock.read).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({p_offset:20}),signal)
})
it('filters all matching pages, including bundle contents, before client pagination',async()=>{
 const posts=Array.from({length:21},(_,i)=>listing(String(i)))
 posts[20]={...listing('bundle'),offer:{...listing('bundle').offer,items:[listing('fish','collectible').offer,listing('fuel').offer]}}
 mock.read.mockImplementation(async args=>({data:{items:posts.slice(args.p_offset,args.p_offset+20),total:21},error:null}))
 const result=await readExchangeMarket({...filter,kind:'fish'},new AbortController().signal)
 expect(result.total).toBe(1);expect(result.items[0].id).toBe('bundle')
 expect(mock.read.mock.calls.map(c=>c[0].p_offset)).toEqual([0,20])
})
it('applies completed status only to own sale history',async()=>{
 mock.read.mockResolvedValue({data:{items:[listing('active'),{...listing('done'),status:'completed'}],total:2},error:null})
 expect((await readExchangeMarket({...filter,tab:'mine',status:'completed'},new AbortController().signal)).items.map(p=>p.id)).toEqual(['done'])
})
